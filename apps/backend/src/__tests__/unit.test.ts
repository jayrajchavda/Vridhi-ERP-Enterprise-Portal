import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { loginSchema } from '../modules/auth/auth.schemas';
import { createCustomerSchema, updateCustomerSchema } from '../modules/customers/customer.schemas';
import { createProductSchema, updateProductSchema } from '../modules/products/product.schemas';
import { createChallanSchema, updateChallanSchema } from '../modules/challans/challan.schemas';
import { AppError } from '../utils/AppError';
import { successResponse, errorResponse } from '../utils/apiResponse';

describe('Backend Unit Test Suite', () => {
  describe('Zod Schema Validation', () => {
    it('should validate correct login payload', () => {
      const valid = { email: 'admin@demo.com', password: 'Passw0rd!' };
      const parsed = loginSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject invalid email in login payload', () => {
      const invalid = { email: 'not-an-email', password: 'Passw0rd!' };
      const parsed = loginSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should validate customer creation schema', () => {
      const payload = {
        name: 'Acme Corp',
        mobile: '9876543210',
        customerType: 'WHOLESALE',
        status: 'ACTIVE',
      };
      const parsed = createCustomerSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('should reject non-10-digit mobile numbers', () => {
      const payload = {
        name: 'Acme Corp',
        mobile: '12345',
        customerType: 'RETAIL',
        status: 'LEAD',
      };
      const parsed = createCustomerSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });

    it('should validate product creation schema', () => {
      const payload = {
        name: 'Steel Rod 10mm',
        sku: 'SR-10MM',
        category: 'Raw Materials',
        unitPrice: '450.00',
        currentStock: 100,
        minStockAlert: 10,
      };
      const parsed = createProductSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('should reject negative stock in product creation', () => {
      const payload = {
        name: 'Steel Rod 10mm',
        sku: 'SR-10MM',
        category: 'Raw Materials',
        unitPrice: '450.00',
        currentStock: -5,
        minStockAlert: 10,
      };
      const parsed = createProductSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });

    it('should validate challan creation schema with min 1 item', () => {
      const payload = {
        customerId: 'cl1234567890',
        status: 'DRAFT',
        items: [{ productId: 'pr1234567890', quantity: 5 }],
      };
      const parsed = createChallanSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('should reject empty items array in challan creation', () => {
      const payload = {
        customerId: 'cl1234567890',
        status: 'DRAFT',
        items: [],
      };
      const parsed = createChallanSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe('AppError & Response Utilities', () => {
    it('should instantiate AppError with custom properties', () => {
      const err = new AppError(400, 'INSUFFICIENT_STOCK', 'Not enough stock available', [{ item: 'Product A' }]);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INSUFFICIENT_STOCK');
      expect(err.message).toBe('Not enough stock available');
      expect(err.details).toEqual([{ item: 'Product A' }]);
    });

    it('should format standardized successResponse', () => {
      const res = successResponse({ id: 1, name: 'Test' });
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should format standardized errorResponse', () => {
      const res = errorResponse('UNAUTHORIZED', 'Invalid token');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('UNAUTHORIZED');
      expect(res.error?.message).toBe('Invalid token');
    });
  });
});
