import { z } from 'zod';

const mobileRegex = /^\+?[1-9]\d{9,14}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Vendor Schemas
export const createVendorSchema = z.object({
  name: z.string().min(2, 'Vendor name must be at least 2 characters').max(100).trim(),
  contactPerson: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().regex(mobileRegex, 'Invalid phone number format').trim(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gstNumber: z.string().toUpperCase().regex(gstRegex, 'Invalid GST identification number format').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

export const updateVendorSchema = createVendorSchema.partial();

export const queryVendorSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});

// Purchase Order Schemas
export const purchaseOrderItemInputSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantityOrdered: z.coerce.number().int().positive('quantityOrdered must be a positive integer'),
  unitCost: z.coerce.number().nonnegative('unitCost cannot be negative'),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().min(1, 'vendorId is required'),
  items: z.array(purchaseOrderItemInputSchema).min(1, 'At least 1 item is required in a purchase order'),
});

export const queryPurchaseOrderSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED']).optional(),
  vendorId: z.string().optional(),
});

// Purchase Receipt Schemas
export const purchaseReceiptItemInputSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantityReceived: z.coerce.number().int().positive('quantityReceived must be a positive integer'),
  unitCost: z.coerce.number().nonnegative('unitCost cannot be negative'),
});

export const createPurchaseReceiptSchema = z.object({
  poId: z.string().optional().nullable(),
  vendorId: z.string().min(1, 'vendorId is required'),
  items: z.array(purchaseReceiptItemInputSchema).min(1, 'At least 1 item is required in a purchase receipt'),
});

export const queryPurchaseReceiptSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  poId: z.string().optional(),
  vendorId: z.string().optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type QueryVendorInput = z.infer<typeof queryVendorSchema>;

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type QueryPurchaseOrderInput = z.infer<typeof queryPurchaseOrderSchema>;

export type CreatePurchaseReceiptInput = z.infer<typeof createPurchaseReceiptSchema>;
export type QueryPurchaseReceiptInput = z.infer<typeof queryPurchaseReceiptSchema>;
