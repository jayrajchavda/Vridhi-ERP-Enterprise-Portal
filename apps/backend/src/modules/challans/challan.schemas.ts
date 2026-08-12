import { z } from 'zod';

export const challanItemInputSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.coerce.number().int().positive('quantity must be a positive integer'),
});

export const createChallanSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  status: z.enum(['DRAFT', 'CONFIRMED']).optional().default('DRAFT'),
  items: z.array(challanItemInputSchema).min(1, 'At least 1 item is required in a sales challan'),
});

export const updateChallanSchema = z.object({
  customerId: z.string().min(1).optional(),
  items: z.array(challanItemInputSchema).min(1).optional(),
});

export const queryChallanSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'challanNumber', 'totalAmount', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
export type QueryChallanInput = z.infer<typeof queryChallanSchema>;
