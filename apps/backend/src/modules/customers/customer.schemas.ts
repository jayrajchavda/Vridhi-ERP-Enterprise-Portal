import { z } from 'zod';

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const mobileRegex = /^\+?[1-9]\d{9,14}$/;

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').trim(),
  mobile: z.string().regex(mobileRegex, 'Invalid phone number format').trim(),
  email: z.string().email('Invalid email address format').optional().or(z.literal('')),
  businessName: z.string().max(150).optional().or(z.literal('')),
  gstNumber: z
    .string()
    .toUpperCase()
    .regex(gstRegex, 'Invalid 15-character GST identification number format')
    .optional()
    .or(z.literal('')),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'], {
    errorMap: () => ({ message: 'customerType must be RETAIL, WHOLESALE, or DISTRIBUTOR' }),
  }),
  address: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional().default('LEAD'),
  followUpDate: z
    .string()
    .datetime({ message: 'followUpDate must be a valid ISO date string' })
    .optional()
    .nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const queryCustomerSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
  sortBy: z.enum(['createdAt', 'name', 'status', 'followUpDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createNoteSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty').trim(),
});

export const createInteractionSchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING']),
  notes: z.string().min(1, 'notes content cannot be empty').trim(),
  nextFollowUpDate: z.string().datetime({ message: 'nextFollowUpDate must be a valid ISO date string' }).optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type QueryCustomerInput = z.infer<typeof queryCustomerSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
