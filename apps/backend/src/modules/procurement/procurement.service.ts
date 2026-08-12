import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/AppError';
import { ProductService } from '../products/product.service';
import {
  CreateVendorInput,
  UpdateVendorInput,
  QueryVendorInput,
  CreatePurchaseOrderInput,
  QueryPurchaseOrderInput,
  CreatePurchaseReceiptInput,
  QueryPurchaseReceiptInput,
} from './procurement.schemas';
import { EmailService } from '../../services/email.service';
import { pdfToBuffer } from '../../utils/pdfToBuffer';
import { PdfGenerator } from '../../utils/pdfGenerator';

export class ProcurementService {
  // --- Vendor Actions ---
  static async createVendor(input: CreateVendorInput) {
    return prisma.vendor.create({
      data: {
        name: input.name,
        contactPerson: input.contactPerson || null,
        phone: input.phone,
        email: input.email || null,
        gstNumber: input.gstNumber || null,
        address: input.address || null,
      },
    });
  }

  static async getVendors(query: QueryVendorInput) {
    const { page, limit, q } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = {};
    if (q) {
      where.name = { contains: q };
    }

    const [total, data] = await Promise.all([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
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

  static async getVendorById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', `Vendor with ID '${id}' not found`);
    }
    return vendor;
  }

  static async updateVendor(id: string, input: UpdateVendorInput) {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', `Vendor with ID '${id}' not found`);
    }

    return prisma.vendor.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson || null }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.gstNumber !== undefined && { gstNumber: input.gstNumber || null }),
        ...(input.address !== undefined && { address: input.address || null }),
      },
    });
  }

  // --- Purchase Order Actions ---
  private static async generatePoNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const lastPo = await tx.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: prefix } },
      orderBy: { poNumber: 'desc' },
      select: { poNumber: true },
    });

    let seq = 1;
    if (lastPo) {
      const parts = lastPo.poNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1;
        }
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  static async getReorderSuggestions() {
    // Reuse product service low stock criteria: currentStock <= minStockAlert
    const products = await prisma.product.findMany({
      orderBy: { currentStock: 'asc' },
    });

    const lowStock = products.filter((p) => p.currentStock <= p.minStockAlert);

    return lowStock.map((p) => {
      const suggestedQuantity = Math.max(1, p.minStockAlert * 2 - p.currentStock);
      return {
        product: {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock: p.currentStock,
          minStockAlert: p.minStockAlert,
          unitPrice: p.unitPrice,
        },
        suggestedQuantity,
      };
    });
  }

  static async createPurchaseOrder(input: CreatePurchaseOrderInput, userId: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', `Vendor with ID '${input.vendorId}' not found`);
    }

    const productIds = input.items.map((item) => item.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of input.items) {
      if (!productMap.has(item.productId)) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${item.productId}' not found`);
      }
    }

    return prisma.$transaction(async (tx) => {
      const poNumber = await this.generatePoNumber(tx);

      const itemsToCreate = input.items.map((item) => {
        const prod = productMap.get(item.productId)!;
        return {
          productId: item.productId,
          productNameSnapshot: prod.name,
          skuSnapshot: prod.sku,
          quantityOrdered: item.quantityOrdered,
          unitCost: new Prisma.Decimal(item.unitCost),
        };
      });

      return tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: input.vendorId,
          status: 'DRAFT',
          createdById: userId,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
          vendor: true,
        },
      });
    });
  }

  static async getPurchaseOrders(query: QueryPurchaseOrderInput) {
    const { page, limit, status, vendorId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [total, data] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
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

  static async getPurchaseOrderById(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true } },
        receipts: {
          orderBy: { createdAt: 'desc' },
          include: {
            receivedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!po) {
      throw new AppError(404, 'PO_NOT_FOUND', `Purchase order with ID '${id}' not found`);
    }
    return po;
  }

  static async sendPurchaseOrder(id: string) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new AppError(404, 'PO_NOT_FOUND', `Purchase order with ID '${id}' not found`);
    }

    if (po.status !== 'DRAFT') {
      throw new AppError(409, 'PO_NOT_DRAFT', `Purchase order is in '${po.status}' state and cannot be sent`);
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        vendor: true,
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Trigger Email (Non-blocking background call)
    if (updatedPo.vendor.email) {
      pdfToBuffer((stream) => PdfGenerator.generatePurchaseOrderPdf(updatedPo, stream))
        .then((buffer) => {
          EmailService.sendEmail({
            to: updatedPo.vendor.email!,
            subject: `Purchase Order Sent: ${updatedPo.poNumber}`,
            text: `Dear Supplier,\n\nPlease find attached Purchase Order ${updatedPo.poNumber} for items requested by NexusFlow.\n\nRegards,\nNexusFlow Team`,
            relatedType: 'PO',
            relatedId: updatedPo.id,
            attachments: [
              {
                filename: `po-${updatedPo.poNumber}.pdf`,
                content: buffer,
                contentType: 'application/pdf',
              },
            ],
          });
        })
        .catch((err) => {
          console.error('❌ [ProcurementService] Failed to generate PDF buffer for email:', err);
        });
    }

    return updatedPo;
  }

  static async cancelPurchaseOrder(id: string) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new AppError(404, 'PO_NOT_FOUND', `Purchase order with ID '${id}' not found`);
    }

    if (po.status !== 'DRAFT' && po.status !== 'SENT') {
      throw new AppError(409, 'PO_NOT_CANCELLABLE', `Purchase order is in '${po.status}' state and cannot be cancelled`);
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // --- Purchase Receipt Actions ---
  static async createPurchaseReceipt(input: CreatePurchaseReceiptInput, userId: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', `Vendor with ID '${input.vendorId}' not found`);
    }

    let linkedPo: any = null;
    if (input.poId) {
      linkedPo = await prisma.purchaseOrder.findUnique({ where: { id: input.poId } });
      if (!linkedPo) {
        throw new AppError(404, 'PO_NOT_FOUND', `Linked Purchase Order with ID '${input.poId}' not found`);
      }
      if (linkedPo.status !== 'SENT') {
        throw new AppError(409, 'PO_NOT_SENT', `Cannot receive items against PO in '${linkedPo.status}' status`);
      }
    }

    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of input.items) {
      if (!productMap.has(item.productId)) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${item.productId}' not found`);
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create PurchaseReceipt
      const receipt = await tx.purchaseReceipt.create({
        data: {
          poId: input.poId || null,
          vendorId: input.vendorId,
          receivedById: userId,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantityReceived: item.quantityReceived,
              unitCost: new Prisma.Decimal(item.unitCost),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Adjust Stock for each item using standard applyStockMovement
      for (const item of input.items) {
        await ProductService.applyStockMovement(tx, {
          productId: item.productId,
          quantityChanged: item.quantityReceived,
          movementType: 'IN',
          reason: input.poId
            ? `Purchase receipt for PO: ${linkedPo.poNumber}`
            : `Standalone purchase receipt: ${receipt.id}`,
          userId,
          referencePurchaseReceiptId: receipt.id,
        });
      }

      // 3. If linked PO, transition status to RECEIVED
      if (input.poId) {
        await tx.purchaseOrder.update({
          where: { id: input.poId },
          data: { status: 'RECEIVED' },
        });
      }

      return receipt;
    });
  }

  static async getPurchaseReceipts(query: QueryPurchaseReceiptInput) {
    const { page, limit, poId, vendorId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseReceiptWhereInput = {};
    if (poId) {
      where.poId = poId;
    }
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [total, data] = await Promise.all([
      prisma.purchaseReceipt.count({ where }),
      prisma.purchaseReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
          po: { select: { id: true, poNumber: true } },
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

  static async getPurchaseReceiptById(id: string) {
    const receipt = await prisma.purchaseReceipt.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        vendor: true,
        receivedBy: { select: { id: true, name: true, email: true } },
        po: { select: { id: true, poNumber: true } },
      },
    });

    if (!receipt) {
      throw new AppError(404, 'RECEIPT_NOT_FOUND', `Purchase receipt with ID '${id}' not found`);
    }
    return receipt;
  }
}
