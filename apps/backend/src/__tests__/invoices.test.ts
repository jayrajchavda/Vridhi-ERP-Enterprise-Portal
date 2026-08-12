import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { GstService } from '../modules/invoices/gst.service';
import { Prisma } from '@prisma/client';

describe('Invoicing and GST Calculation Tests', () => {
  let adminToken: string;
  let accountsToken: string;
  let salesToken: string;
  let customerMhId: string;
  let customerGjId: string;
  let productId: string;
  let productNoGstId: string;
  let confirmedChallanMhId: string;
  let confirmedChallanGjId: string;
  let draftChallanId: string;

  beforeAll(async () => {
    // Login tokens
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.com', password: 'Passw0rd!' });
    adminToken = adminRes.body.data?.token;

    const accountsRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'accounts@demo.com', password: 'Passw0rd!' });
    accountsToken = accountsRes.body.data?.token;

    const salesRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@demo.com', password: 'Passw0rd!' });
    salesToken = salesRes.body.data?.token;

    // Create Customers
    const cMhRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'MH Customer Retailers',
        mobile: String(Date.now()).slice(-10),
        customerType: 'RETAIL',
        state: 'Maharashtra',
      });
    customerMhId = cMhRes.body.data.id;

    const cGjRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'GJ Customer Wholesalers',
        mobile: String(Date.now() + 1).slice(-10),
        customerType: 'WHOLESALE',
        state: 'Gujarat',
      });
    customerGjId = cGjRes.body.data.id;

    // Create Products
    const pRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Fastener M10',
        sku: `SKU-${Date.now()}`,
        category: 'Fasteners',
        unitPrice: 1000.00,
        currentStock: 100,
        gstRate: 18.00,
      });
    productId = pRes.body.data.id;

    const pNoGstRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unregulated Fastener',
        sku: `SKU-NOGST-${Date.now()}`,
        category: 'Fasteners',
        unitPrice: 500.00,
        currentStock: 100,
        gstRate: null, // no GST
      });
    productNoGstId = pNoGstRes.body.data.id;

    // Create Confirmed Challan MH
    const mhChRes = await request(app)
      .post('/api/v1/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: customerMhId,
        status: 'CONFIRMED',
        items: [{ productId, quantity: 10 }],
      });
    confirmedChallanMhId = mhChRes.body.data.id;

    // Create Confirmed Challan GJ
    const gjChRes = await request(app)
      .post('/api/v1/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: customerGjId,
        status: 'CONFIRMED',
        items: [{ productId, quantity: 10 }],
      });
    confirmedChallanGjId = gjChRes.body.data.id;

    // Create Draft Challan
    const draftRes = await request(app)
      .post('/api/v1/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: customerMhId,
        status: 'DRAFT',
        items: [{ productId, quantity: 5 }],
      });
    draftChallanId = draftRes.body.data.id;
  });

  describe('GST Service Unit Tests', () => {
    it('should split GST into CGST/SGST for intra-state transactions', () => {
      const items = [{ amount: 10000.00, gstRate: 18.00 }];
      const result = GstService.calculateGst('Maharashtra', items);

      expect(result.subtotal.toNumber()).toBe(10000.00);
      expect(result.cgstAmount.toNumber()).toBe(900.00);
      expect(result.sgstAmount.toNumber()).toBe(900.00);
      expect(result.igstAmount.toNumber()).toBe(0.00);
      expect(result.totalAmount.toNumber()).toBe(11800.00);
      expect(result.hasUnconfiguredGst).toBe(false);
    });

    it('should assign full GST to IGST for inter-state transactions', () => {
      const items = [{ amount: 10000.00, gstRate: 18.00 }];
      const result = GstService.calculateGst('Gujarat', items);

      expect(result.subtotal.toNumber()).toBe(10000.00);
      expect(result.cgstAmount.toNumber()).toBe(0.00);
      expect(result.sgstAmount.toNumber()).toBe(0.00);
      expect(result.igstAmount.toNumber()).toBe(1800.00);
      expect(result.totalAmount.toNumber()).toBe(11800.00);
      expect(result.hasUnconfiguredGst).toBe(false);
    });

    it('should default to intra-state split if customer state is null', () => {
      const items = [{ amount: 5000.00, gstRate: 12.00 }];
      const result = GstService.calculateGst(null, items);

      expect(result.cgstAmount.toNumber()).toBe(300.00);
      expect(result.sgstAmount.toNumber()).toBe(300.00);
      expect(result.igstAmount.toNumber()).toBe(0.00);
      expect(result.totalAmount.toNumber()).toBe(5600.00);
    });

    it('should mark unconfigured GST warning and apply 0% tax for null gstRate products', () => {
      const items = [
        { amount: 5000.00, gstRate: 18.00 },
        { amount: 2000.00, gstRate: null },
      ];
      const result = GstService.calculateGst('Maharashtra', items);

      expect(result.subtotal.toNumber()).toBe(7000.00);
      // Tax applies to 5000.00 at 18% = 900.00 -> 450.00 CGST + 450.00 SGST
      expect(result.cgstAmount.toNumber()).toBe(450.00);
      expect(result.sgstAmount.toNumber()).toBe(450.00);
      expect(result.totalAmount.toNumber()).toBe(7900.00);
      expect(result.hasUnconfiguredGst).toBe(true);
    });
  });

  describe('Invoice Integration Endpoints', () => {
    let invoiceMhId: string;

    it('should convert an intra-state MH confirmed challan to invoice', async () => {
      const res = await request(app)
        .post(`/api/v1/challans/${confirmedChallanMhId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(res.body.data.status).toBe('UNPAID');

      // 10 items * 1000 = 10000 subtotal. 18% GST -> 900 CGST + 900 SGST
      expect(Number(res.body.data.subtotal)).toBe(10000);
      expect(Number(res.body.data.cgstAmount)).toBe(900);
      expect(Number(res.body.data.sgstAmount)).toBe(900);
      expect(Number(res.body.data.igstAmount)).toBe(0);
      expect(Number(res.body.data.totalAmount)).toBe(11800);

      invoiceMhId = res.body.data.id;
    });

    it('should convert an inter-state GJ confirmed challan to invoice', async () => {
      const res = await request(app)
        .post(`/api/v1/challans/${confirmedChallanGjId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(201);
      // 10 items * 1000 = 10000 subtotal. 18% GST -> 1800 IGST
      expect(Number(res.body.data.subtotal)).toBe(10000);
      expect(Number(res.body.data.cgstAmount)).toBe(0);
      expect(Number(res.body.data.sgstAmount)).toBe(0);
      expect(Number(res.body.data.igstAmount)).toBe(1800);
      expect(Number(res.body.data.totalAmount)).toBe(11800);
    });

    it('should reject converting a DRAFT challan with 409 CHALLAN_NOT_CONFIRMED', async () => {
      const res = await request(app)
        .post(`/api/v1/challans/${draftChallanId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CHALLAN_NOT_CONFIRMED');
    });

    it('should reject double conversion with 409 INVOICE_ALREADY_EXISTS and provide existing invoice id', async () => {
      const res = await request(app)
        .post(`/api/v1/challans/${confirmedChallanMhId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVOICE_ALREADY_EXISTS');
      expect(res.body.error.details.invoiceId).toBe(invoiceMhId);
    });

    it('should list invoices with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get invoice detail and warn if unconfigured GST rate is found', async () => {
      // Create a confirmed challan with a null GST product to test warning flag
      const unChRes = await request(app)
        .post('/api/v1/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: customerMhId,
          status: 'CONFIRMED',
          items: [{ productId: productNoGstId, quantity: 1 }],
        });
      const unChId = unChRes.body.data.id;

      const invRes = await request(app)
        .post(`/api/v1/challans/${unChId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${accountsToken}`);
      const unInvId = invRes.body.data.id;

      const detailRes = await request(app)
        .get(`/api/v1/invoices/${unInvId}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.hasUnconfiguredGst).toBe(true);
    });
  });

  describe('Payments & Status Tracking', () => {
    let invoiceId: string;
    let invoiceTotal: number;

    beforeAll(async () => {
      // Create fresh invoice for payment test
      const uniqueCh = await request(app)
        .post('/api/v1/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: customerMhId,
          status: 'CONFIRMED',
          items: [{ productId, quantity: 5 }],
        });
      const chId = uniqueCh.body.data.id;

      const invRes = await request(app)
        .post(`/api/v1/challans/${chId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${accountsToken}`);
      invoiceId = invRes.body.data.id;
      invoiceTotal = Number(invRes.body.data.totalAmount); // 5000 + 900 = 5900
    });

    it('should record a partial payment and set status to PARTIALLY_PAID', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payments`)
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({
          amount: 2000,
          method: 'UPI',
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.data.amount)).toBe(2000);

      // Verify invoice status
      const invRes = await request(app)
        .get(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(invRes.body.data.status).toBe('PARTIALLY_PAID');
    });

    it('should reject payment exceeding remaining balance with 409 OVERPAYMENT', async () => {
      // Total is 5900, 2000 is paid. Remaining balance is 3900. Try to pay 4000.
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payments`)
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({
          amount: 4000,
          method: 'CASH',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OVERPAYMENT');
      expect(res.body.error.details.remainingBalance).toBe(3900);
    });

    it('should record final payment and set status to PAID', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payments`)
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({
          amount: 3900,
          method: 'BANK_TRANSFER',
        });

      expect(res.status).toBe(201);

      // Verify invoice status
      const invRes = await request(app)
        .get(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(invRes.body.data.status).toBe('PAID');
    });
  });
});
