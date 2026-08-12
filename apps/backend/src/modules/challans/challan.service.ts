import { Prisma } from '@prisma/client';
import { ChallanStatus, MovementType } from '../../types/domain';
import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/AppError';
import { ProductService } from '../products/product.service';
import { CreateChallanInput, UpdateChallanInput, QueryChallanInput } from './challan.schemas';
import { EmailService } from '../../services/email.service';
import { pdfToBuffer } from '../../utils/pdfToBuffer';
import { PdfGenerator } from '../../utils/pdfGenerator';

export class ChallanService {
  /**
   * Generates a unique sequential challan number formatted as CH-{YEAR}-{0001}
   * Must execute inside a transaction to prevent race conditions.
   */
  private static async generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CH-${year}-`;

    const lastChallan = await tx.salesChallan.findFirst({
      where: { challanNumber: { startsWith: prefix } },
      orderBy: { challanNumber: 'desc' },
      select: { challanNumber: true },
    });

    let seq = 1;
    if (lastChallan) {
      const parts = lastChallan.challanNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1;
        }
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  static async createChallan(input: CreateChallanInput, userId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${input.customerId}' not found`);
    }

    // Fetch products & calculate snapshot fields
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all products exist
    for (const item of input.items) {
      if (!productMap.has(item.productId)) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${item.productId}' not found`);
      }
    }

    // Compute line totals & snapshot fields
    let totalQuantity = 0;
    let totalAmountDecimal = new Prisma.Decimal(0);

    const itemsToCreate = input.items.map((item) => {
      const prod = productMap.get(item.productId)!;
      const unitPriceSnapshot = prod.unitPrice;
      const lineTotal = unitPriceSnapshot.mul(item.quantity);

      totalQuantity += item.quantity;
      totalAmountDecimal = totalAmountDecimal.add(lineTotal);

      return {
        productId: prod.id,
        productNameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        unitPriceSnapshot,
        quantity: item.quantity,
        lineTotal,
      };
    });

    // Execute atomic transaction for creation and conditional confirmation
    return prisma.$transaction(async (tx) => {
      const challanNumber = await this.generateChallanNumber(tx);
      const isConfirmed = input.status === 'CONFIRMED';

      const challan = await tx.salesChallan.create({
        data: {
          challanNumber,
          customerId: input.customerId,
          status: isConfirmed ? 'CONFIRMED' : 'DRAFT',
          totalQuantity,
          totalAmount: totalAmountDecimal,
          createdById: userId,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
          customer: { select: { id: true, name: true, mobile: true, businessName: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // If created directly in CONFIRMED status, execute stock deduction
      if (isConfirmed) {
        // Pre-check stock for ALL items first
        const shortItems = [];
        for (const item of input.items) {
          const prod = productMap.get(item.productId)!;
          if (prod.currentStock < item.quantity) {
            shortItems.push({
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              requested: item.quantity,
              available: prod.currentStock,
              shortage: item.quantity - prod.currentStock,
            });
          }
        }

        if (shortItems.length > 0) {
          throw new AppError(
            400,
            'INSUFFICIENT_STOCK',
            'Cannot confirm challan due to insufficient stock on one or more items',
            shortItems
          );
        }

        // Apply deductions
        for (const item of input.items) {
          await ProductService.applyStockMovement(tx, {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: 'OUT',
            reason: `Sales challan confirmed: ${challan.challanNumber}`,
            userId,
            referenceChallanId: challan.id,
          });
        }
      }

      return challan;
    });
  }

  static async getChallans(query: QueryChallanInput) {
    const { page, limit, status, customerId, startDate, endDate, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SalesChallanWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [total, data] = await Promise.all([
      prisma.salesChallan.count({ where }),
      prisma.salesChallan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          customer: { select: { id: true, name: true, mobile: true, businessName: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getChallanById(id: string) {
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, mobile: true, email: true, businessName: true, gstNumber: true, address: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: true,
        invoice: { select: { id: true, invoiceNumber: true } },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!challan) {
      throw new AppError(404, 'CHALLAN_NOT_FOUND', `Sales challan with ID '${id}' not found`);
    }

    return challan;
  }

  static async updateChallan(id: string, input: UpdateChallanInput) {
    const existing = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new AppError(404, 'CHALLAN_NOT_FOUND', `Sales challan with ID '${id}' not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError(
        409,
        'CHALLAN_NOT_EDITABLE',
        `Challan ${existing.challanNumber} is ${existing.status} and cannot be edited`
      );
    }

    let customerId = existing.customerId;
    if (input.customerId && input.customerId !== existing.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) {
        throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${input.customerId}' not found`);
      }
      customerId = input.customerId;
    }

    return prisma.$transaction(async (tx) => {
      let totalQuantity = existing.totalQuantity;
      let totalAmountDecimal = existing.totalAmount;

      if (input.items && input.items.length > 0) {
        // Delete existing items
        await tx.challanItem.deleteMany({ where: { challanId: id } });

        // Fetch products and re-calculate snapshots
        const productIds = input.items.map((i) => i.productId);
        const products = await tx.product.findMany({ where: { id: { in: productIds } } });
        const productMap = new Map(products.map((p) => [p.id, p]));

        for (const item of input.items) {
          if (!productMap.has(item.productId)) {
            throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${item.productId}' not found`);
          }
        }

        totalQuantity = 0;
        totalAmountDecimal = new Prisma.Decimal(0);

        const newItemsToCreate = input.items.map((item) => {
          const prod = productMap.get(item.productId)!;
          const unitPriceSnapshot = prod.unitPrice;
          const lineTotal = unitPriceSnapshot.mul(item.quantity);

          totalQuantity += item.quantity;
          totalAmountDecimal = totalAmountDecimal.add(lineTotal);

          return {
            challanId: id,
            productId: prod.id,
            productNameSnapshot: prod.name,
            skuSnapshot: prod.sku,
            unitPriceSnapshot,
            quantity: item.quantity,
            lineTotal,
          };
        });

        await tx.challanItem.createMany({ data: newItemsToCreate });
      }

      const updated = await tx.salesChallan.update({
        where: { id },
        data: {
          customerId,
          totalQuantity,
          totalAmount: totalAmountDecimal,
        },
        include: {
          items: true,
          customer: { select: { id: true, name: true, mobile: true, businessName: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      return updated;
    });
  }

  static async confirmChallan(id: string, userId: string) {
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new AppError(404, 'CHALLAN_NOT_FOUND', `Sales challan with ID '${id}' not found`);
    }

    if (challan.status !== 'DRAFT') {
      throw new AppError(
        409,
        'CHALLAN_NOT_DRAFT',
        `Challan ${challan.challanNumber} is already ${challan.status} and cannot be confirmed`
      );
    }

    return prisma.$transaction(async (tx) => {
      // Pre-check stock for ALL items
      const productIds = challan.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const shortItems = [];
      for (const item of challan.items) {
        const prod = productMap.get(item.productId);
        const currentStock = prod ? prod.currentStock : 0;

        if (!prod || currentStock < item.quantity) {
          shortItems.push({
            productId: item.productId,
            productName: item.productNameSnapshot,
            sku: item.skuSnapshot,
            requested: item.quantity,
            available: currentStock,
            shortage: item.quantity - currentStock,
          });
        }
      }

      if (shortItems.length > 0) {
        throw new AppError(
          400,
          'INSUFFICIENT_STOCK',
          'Cannot confirm sales challan due to insufficient stock on one or more items',
          shortItems
        );
      }

      // Apply stock deductions transactionally for each item
      for (const item of challan.items) {
        await ProductService.applyStockMovement(tx, {
          productId: item.productId,
          quantityChanged: item.quantity,
          movementType: 'OUT',
          reason: `Sales challan confirmed: ${challan.challanNumber}`,
          userId,
          referenceChallanId: challan.id,
        });
      }

      const confirmedChallan = await tx.salesChallan.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          items: true,
          customer: { select: { id: true, name: true, mobile: true, businessName: true, email: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Trigger Email (Non-blocking background call)
      if (confirmedChallan.customer.email) {
        pdfToBuffer((stream) => PdfGenerator.generateChallanPdf(confirmedChallan, stream))
          .then((buffer) => {
            EmailService.sendEmail({
              to: confirmedChallan.customer.email!,
              subject: `Delivery Challan Confirmed: ${confirmedChallan.challanNumber}`,
              text: `Dear Customer,\n\nYour sales challan ${confirmedChallan.challanNumber} has been confirmed. Please find the delivery details in the attached PDF.\n\nRegards,\nNexusFlow Team`,
              relatedType: 'CHALLAN',
              relatedId: confirmedChallan.id,
              attachments: [
                {
                  filename: `challan-${confirmedChallan.challanNumber}.pdf`,
                  content: buffer,
                  contentType: 'application/pdf',
                },
              ],
            });
          })
          .catch((err) => {
            console.error('❌ [ChallanService] Failed to generate PDF buffer for email:', err);
          });
      }

      return confirmedChallan;
    });
  }

  static async cancelChallan(id: string, userId: string) {
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new AppError(404, 'CHALLAN_NOT_FOUND', `Sales challan with ID '${id}' not found`);
    }

    if (challan.status === 'CANCELLED') {
      throw new AppError(409, 'CHALLAN_ALREADY_CANCELLED', `Challan ${challan.challanNumber} is already cancelled`);
    }

    return prisma.$transaction(async (tx) => {
      // If challan was CONFIRMED, reverse the stock (add items back via IN movement)
      if (challan.status === 'CONFIRMED') {
        for (const item of challan.items) {
          await ProductService.applyStockMovement(tx, {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: 'IN',
            reason: `Challan cancelled: ${challan.challanNumber}`,
            userId,
            referenceChallanId: challan.id,
          });
        }
      }

      const cancelledChallan = await tx.salesChallan.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          items: true,
          customer: { select: { id: true, name: true, mobile: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      return cancelledChallan;
    });
  }
}
