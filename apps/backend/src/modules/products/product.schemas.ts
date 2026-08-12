import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').trim(),
  sku: z.string().min(1, 'SKU is required').toUpperCase().trim(),
  category: z.string().min(1, 'Category is required').trim(),
  unitPrice: z.coerce.number().positive('Unit price must be greater than 0'),
  currentStock: z.coerce.number().int().min(0, 'Current stock cannot be negative').default(0),
  minStockAlert: z.coerce.number().int().min(0, 'Minimum stock alert threshold cannot be negative').default(0),
  location: z.string().optional().or(z.literal('')),
  gstRate: z.coerce.number().min(0).max(100).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const queryProductSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'name', 'sku', 'currentStock', 'unitPrice']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createStockMovementSchema = z.object({
  movementType: z.enum(['IN', 'OUT'], {
    errorMap: () => ({ message: 'movementType must be IN or OUT' }),
  }),
  quantityChanged: z.coerce.number().int().positive('quantityChanged must be a positive integer'),
  reason: z.string().min(1, 'Reason for stock movement is required').trim(),
  referenceChallanId: z.string().optional().nullable(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type QueryProductInput = z.infer<typeof queryProductSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
