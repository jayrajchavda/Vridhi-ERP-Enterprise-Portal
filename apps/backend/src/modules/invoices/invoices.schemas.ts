import { z } from 'zod';

export const queryInvoiceSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID']).optional(),
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive('amount must be a positive number'),
  method: z.enum(['UPI', 'BANK_TRANSFER', 'CASH']),
  paidAt: z.string().datetime({ message: 'paidAt must be a valid ISO date string' }).optional().default(() => new Date().toISOString()),
});

export type QueryInvoiceInput = z.infer<typeof queryInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
