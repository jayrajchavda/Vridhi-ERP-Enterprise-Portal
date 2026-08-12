import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../db/prisma';

describe('Email Service Integration and Non-blocking Tests', () => {
  let adminToken: string;
  let salesToken: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    // Login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.com', password: 'Passw0rd!' });
    adminToken = adminRes.body.data?.token;

    const salesRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@demo.com', password: 'Passw0rd!' });
    salesToken = salesRes.body.data?.token;

    // Create a customer with a valid email
    const cRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'Email Test Customer',
        mobile: String(Date.now()).slice(-10),
        customerType: 'RETAIL',
        email: 'customer@testemail.com',
      });
    customerId = cRes.body.data.id;

    // Create a product
    const pRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Email Test Gear',
        sku: `SKU-EM-${Date.now()}`,
        category: 'Gears',
        unitPrice: 500.00,
        currentStock: 20,
        minStockAlert: 2,
      });
    productId = pRes.body.data.id;
  });

  it('should confirm sales challan and return success immediately, and asynchronously create an EmailLog', async () => {
    // 1. Create a draft challan
    const draftRes = await request(app)
      .post('/api/v1/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        status: 'DRAFT',
        items: [{ productId, quantity: 2 }],
      });
    const challanId = draftRes.body.data.id;

    // 2. Temporarily inject a failing SMTP port in env to simulate unreachable SMTP
    const originalPort = process.env.EMAIL_PORT;
    process.env.EMAIL_PORT = '9999'; // invalid port to force failure

    // 3. Confirm challan - must succeed immediately despite email failure
    const confirmRes = await request(app)
      .post(`/api/v1/challans/${challanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');

    // Restore env port
    if (originalPort) {
      process.env.EMAIL_PORT = originalPort;
    } else {
      delete process.env.EMAIL_PORT;
    }

    // 4. Wait brief moment for the async send promise to settle
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 5. Query EmailLog in the DB
    const emailLog = await prisma.emailLog.findFirst({
      where: { relatedId: challanId, relatedType: 'CHALLAN' },
      orderBy: { createdAt: 'desc' },
    });

    expect(emailLog).toBeDefined();
    expect(emailLog?.recipientEmail).toBe('customer@testemail.com');
    expect(emailLog?.status).toBe('FAILED'); // should fail since port 9999 is blocked/invalid
    expect(emailLog?.errorMessage).toBeDefined();
  });
});
