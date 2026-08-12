import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('API Integration Tests', () => {
  let adminToken: string;
  let salesToken: string;
  let warehouseToken: string;
  let createdCustomerId: string;
  let createdProductId: string;

  beforeAll(async () => {
    // Login as Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.com', password: 'Passw0rd!' });
    adminToken = adminRes.body.data?.token;

    // Login as Sales
    const salesRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@demo.com', password: 'Passw0rd!' });
    salesToken = salesRes.body.data?.token;

    // Login as Warehouse
    const warehouseRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warehouse@demo.com', password: 'Passw0rd!' });
    warehouseToken = warehouseRes.body.data?.token;
  });

  describe('Auth Module', () => {
    it('should login admin with valid credentials', () => {
      expect(adminToken).toBeDefined();
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@demo.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return current user for GET /auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('ADMIN');
    });
  });

  describe('Customer Module', () => {
    it('should create customer as ADMIN', async () => {
      const uniqueMobile = String(Date.now()).slice(-10);
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Customer Ltd',
          mobile: uniqueMobile,
          customerType: 'WHOLESALE',
          status: 'ACTIVE',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Customer Ltd');
      createdCustomerId = res.body.data.id;
    });

    it('should list customers with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Products & Stock Module', () => {
    it('should create product as WAREHOUSE', async () => {
      const uniqueSku = `TEST-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          name: 'Test Gear 500',
          sku: uniqueSku,
          category: 'Gears',
          unitPrice: '150.00',
          currentStock: 100,
          minStockAlert: 10,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.sku).toBe(uniqueSku);
      createdProductId = res.body.data.id;
    });

    it('should apply manual stock IN movement', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${createdProductId}/stock-movements`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          movementType: 'IN',
          quantityChanged: 50,
          reason: 'Test Restock',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStock).toBe(150);
    });

    it('should reject manual stock OUT exceeding stock with 400 INSUFFICIENT_STOCK', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${createdProductId}/stock-movements`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          movementType: 'OUT',
          quantityChanged: 99999,
          reason: 'Excessive Removal',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('Sales Challan Lifecycle', () => {
    let challanId: string;

    it('should create DRAFT challan as SALES', async () => {
      const res = await request(app)
        .post('/api/v1/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: createdCustomerId,
          status: 'DRAFT',
          items: [{ productId: createdProductId, quantity: 10 }],
        });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.challanNumber).toMatch(/^CH-\d{4}-\d{4}$/);
      challanId = res.body.data.id;
    });

    it('should confirm DRAFT challan and deduct stock atomically', async () => {
      const res = await request(app)
        .post(`/api/v1/challans/${challanId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');

      // Verify product stock was reduced by 10 (150 - 10 = 140)
      const prodRes = await request(app)
        .get(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(prodRes.body.data.currentStock).toBe(140);
    });

    it('should reject editing a confirmed challan with 409 CHALLAN_NOT_EDITABLE', async () => {
      const res = await request(app)
        .patch(`/api/v1/challans/${challanId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ items: [{ productId: createdProductId, quantity: 5 }] });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CHALLAN_NOT_EDITABLE');
    });

    it('should cancel CONFIRMED challan and reverse stock', async () => {
      const res = await request(app)
        .post(`/api/v1/challans/${challanId}/cancel`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');

      // Verify stock restored (140 + 10 = 150)
      const prodRes = await request(app)
        .get(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(prodRes.body.data.currentStock).toBe(150);
    });
  });

  describe('Health Endpoint', () => {
    it('should return 200 with DB status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.data.dbConnected).toBe(true);
    });
  });
});
