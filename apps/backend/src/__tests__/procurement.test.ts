import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Procurement Module API Integration Tests', () => {
  let adminToken: string;
  let warehouseToken: string;
  let salesToken: string;
  let createdVendorId: string;
  let createdPoId: string;
  let createdProductId: string;

  beforeAll(async () => {
    // Login as Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.com', password: 'Passw0rd!' });
    adminToken = adminRes.body.data?.token;

    // Login as Warehouse
    const warehouseRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warehouse@demo.com', password: 'Passw0rd!' });
    warehouseToken = warehouseRes.body.data?.token;

    // Login as Sales
    const salesRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@demo.com', password: 'Passw0rd!' });
    salesToken = salesRes.body.data?.token;

    // Create a product for PO tests
    const uniqueSku = `PO-PROD-${Date.now()}`;
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        name: 'PO Test Item',
        sku: uniqueSku,
        category: 'Hardware',
        unitPrice: '1000.00',
        currentStock: 5,
        minStockAlert: 10,
      });
    createdProductId = prodRes.body.data.id;
  });

  describe('Vendor Endpoints', () => {
    it('should create a vendor as ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/procurement/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Supreme Fasteners',
          contactPerson: 'John Doe',
          phone: '+919900990099',
          email: 'john@supremefasteners.com',
          gstNumber: '27AAAAA1111A1Z0',
          address: 'Plot 4, Industrial Area, Thane, MH',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Supreme Fasteners');
      createdVendorId = res.body.data.id;
    });

    it('should prevent non-admin/warehouse from creating vendors', async () => {
      const res = await request(app)
        .post('/api/v1/procurement/vendors')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Sales Vendor',
          phone: '+919900990088',
        });
      expect(res.status).toBe(403);
    });

    it('should list vendors with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/procurement/vendors')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get vendor by id with details', async () => {
      const res = await request(app)
        .get(`/api/v1/procurement/vendors/${createdVendorId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Supreme Fasteners');
    });

    it('should update vendor details', async () => {
      const res = await request(app)
        .patch(`/api/v1/procurement/vendors/${createdVendorId}`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({ contactPerson: 'Jane Doe' });
      expect(res.status).toBe(200);
      expect(res.body.data.contactPerson).toBe('Jane Doe');
    });
  });

  describe('Purchase Order Suggestions & suggestions', () => {
    it('should retrieve reorder suggestions matching low stock items', async () => {
      const res = await request(app)
        .get('/api/v1/procurement/purchase-orders/suggestions')
        .set('Authorization', `Bearer ${warehouseToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const targetSuggestion = res.body.data.find(
        (s: any) => s.product.id === createdProductId
      );
      expect(targetSuggestion).toBeDefined();
      // suggested = max(1, minStockAlert * 2 - currentStock) = 10 * 2 - 5 = 15
      expect(targetSuggestion.suggestedQuantity).toBe(15);
    });
  });

  describe('Purchase Order Lifecycle', () => {
    it('should create a DRAFT purchase order', async () => {
      const res = await request(app)
        .post('/api/v1/procurement/purchase-orders')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          vendorId: createdVendorId,
          items: [
            {
              productId: createdProductId,
              quantityOrdered: 10,
              unitCost: 950.00,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
      createdPoId = res.body.data.id;
    });

    it('should transit PO from DRAFT to SENT status', async () => {
      const res = await request(app)
        .post(`/api/v1/procurement/purchase-orders/${createdPoId}/send`)
        .set('Authorization', `Bearer ${warehouseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SENT');
    });

    it('should reject transitions from SENT back to DRAFT', async () => {
      const res = await request(app)
        .post(`/api/v1/procurement/purchase-orders/${createdPoId}/send`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      expect(res.status).toBe(409);
    });
  });

  describe('Purchase Receipts & Stock Integration', () => {
    it('should log a receipt against the PO, transition PO to RECEIVED, and increment product stock', async () => {
      // Prior stock is 5
      const res = await request(app)
        .post('/api/v1/procurement/purchase-receipts')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          poId: createdPoId,
          vendorId: createdVendorId,
          items: [
            {
              productId: createdProductId,
              quantityReceived: 10,
              unitCost: 950.00,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.poId).toBe(createdPoId);

      // Verify PO transitioned to RECEIVED
      const poRes = await request(app)
        .get(`/api/v1/procurement/purchase-orders/${createdPoId}`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      expect(poRes.body.data.status).toBe('RECEIVED');

      // Verify Product currentStock is incremented by 10 (5 + 10 = 15)
      const prodRes = await request(app)
        .get(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      expect(prodRes.body.data.currentStock).toBe(15);
    });

    it('should create standalone receipt and adjust stock correctly', async () => {
      // Prior stock is 15
      const res = await request(app)
        .post('/api/v1/procurement/purchase-receipts')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          vendorId: createdVendorId,
          items: [
            {
              productId: createdProductId,
              quantityReceived: 5,
              unitCost: 950.00,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.poId).toBeNull();

      // Verify Product currentStock is incremented by 5 (15 + 5 = 20)
      const prodRes = await request(app)
        .get(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      expect(prodRes.body.data.currentStock).toBe(20);
    });
  });
});
