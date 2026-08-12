import { Prisma } from '@prisma/client';
import { MovementType } from '../../types/domain';
import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/AppError';
import {
  CreateProductInput,
  UpdateProductInput,
  QueryProductInput,
  CreateStockMovementInput,
} from './product.schemas';

export interface ApplyStockMovementParams {
  productId: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  userId: string;
  referenceChallanId?: string | null;
  referencePurchaseReceiptId?: string | null;
}

export class ProductService {
  /**
   * Core reusable stock movement function.
   * MUST execute inside a Prisma transaction to guarantee atomic stock changes.
   */
  static async applyStockMovement(
    tx: Prisma.TransactionClient,
    params: ApplyStockMovementParams
  ) {
    const { productId, quantityChanged, movementType, reason, userId, referenceChallanId, referencePurchaseReceiptId } = params;

    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${productId}' not found`);
    }

    if (movementType === 'OUT') {
      if (product.currentStock - quantityChanged < 0) {
        throw new AppError(
          400,
          'INSUFFICIENT_STOCK',
          `Insufficient stock for product '${product.name}' (${product.sku}). Requested: ${quantityChanged}, Available: ${product.currentStock}`,
          {
            available: product.currentStock,
            requested: quantityChanged,
            productId: product.id,
            sku: product.sku,
          }
        );
      }
    }

    const newStock =
      movementType === 'IN'
        ? product.currentStock + quantityChanged
        : product.currentStock - quantityChanged;

    const [updatedProduct] = await Promise.all([
      tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      }),
      tx.stockMovement.create({
        data: {
          productId,
          quantityChanged,
          movementType,
          reason,
          createdById: userId,
          referenceChallanId: referenceChallanId || null,
          referencePurchaseReceiptId: referencePurchaseReceiptId || null,
        },
      }),
    ]);

    return updatedProduct;
  }

  static async createProduct(input: CreateProductInput) {
    const existingSku = await prisma.product.findUnique({
      where: { sku: input.sku },
    });

    if (existingSku) {
      throw new AppError(409, 'DUPLICATE_SKU', `A product with SKU '${input.sku}' already exists`);
    }

    const product = await prisma.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        currentStock: input.currentStock,
        minStockAlert: input.minStockAlert,
        location: input.location || null,
        gstRate: input.gstRate !== undefined && input.gstRate !== null ? new Prisma.Decimal(input.gstRate) : null,
      },
    });

    return product;
  }

  static async getProducts(query: QueryProductInput) {
    const { page, limit, q, category, lowStock, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (category) {
      where.category = { equals: category };
    }

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { category: { contains: q } },
      ];
    }

    let [allFiltered, data] = await Promise.all([
      prisma.product.findMany({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
      }),
    ]);

    // Apply in-memory lowStock filter for precise comparison of two fields
    if (lowStock) {
      allFiltered = allFiltered.filter((p) => p.currentStock <= p.minStockAlert);
      data = data.filter((p) => p.currentStock <= p.minStockAlert);
    }

    const total = allFiltered.length;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async getLowStockProducts() {
    const products = await prisma.product.findMany({
      orderBy: { currentStock: 'asc' },
    });

    return products.filter((p) => p.currentStock <= p.minStockAlert);
  }

  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            referenceChallan: {
              select: { id: true, challanNumber: true, status: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${id}' not found`);
    }

    return product;
  }

  static async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${id}' not found`);
    }

    if (input.sku && input.sku !== existing.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: { sku: input.sku },
      });
      if (duplicateSku) {
        throw new AppError(409, 'DUPLICATE_SKU', `A product with SKU '${input.sku}' already exists`);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.unitPrice !== undefined && { unitPrice: new Prisma.Decimal(input.unitPrice) }),
        ...(input.minStockAlert !== undefined && { minStockAlert: input.minStockAlert }),
        ...(input.location !== undefined && { location: input.location || null }),
        ...(input.gstRate !== undefined && { gstRate: input.gstRate !== null ? new Prisma.Decimal(input.gstRate) : null }),
      },
    });

    return updated;
  }

  static async logStockMovement(productId: string, input: CreateStockMovementInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      return this.applyStockMovement(tx, {
        productId,
        quantityChanged: input.quantityChanged,
        movementType: input.movementType,
        reason: input.reason,
        userId,
        referenceChallanId: input.referenceChallanId,
      });
    });
  }

  static async getProductStockMovements(productId: string, page = 1, limit = 20) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product with ID '${productId}' not found`);
    }

    const skip = (page - 1) * limit;
    const where = { productId };

    const [total, data] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          referenceChallan: {
            select: { id: true, challanNumber: true, status: true },
          },
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
}
