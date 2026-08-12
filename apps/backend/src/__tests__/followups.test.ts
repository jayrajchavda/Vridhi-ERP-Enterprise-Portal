import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../db/prisma';

describe('Customer Follow-ups and Interactions API Integration Tests', () => {
  let adminToken: string;
  let salesToken: string;
  let accountsToken: string;
  let createdCustomerId: string;

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

    const accountsRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'accounts@demo.com', password: 'Passw0rd!' });
    accountsToken = accountsRes.body.data?.token;

    // Create a customer
    const cRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'FollowUp Customer Ltd',
        mobile: String(Date.now()).slice(-10),
        customerType: 'WHOLESALE',
      });
    createdCustomerId = cRes.body.data.id;
  });

  describe('Customer Interaction Logs', () => {
    it('should log a new customer interaction and update followUpDate', async () => {
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 5);

      const res = await request(app)
        .post(`/api/v1/customers/${createdCustomerId}/interactions`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          type: 'CALL',
          notes: 'Called customer to discuss fasteners contract.',
          nextFollowUpDate: nextFollowUp.toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('CALL');
      expect(res.body.data.notes).toBe('Called customer to discuss fasteners contract.');

      // Verify customer followUpDate is updated
      const cRes = await request(app)
        .get(`/api/v1/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(new Date(cRes.body.data.followUpDate).toDateString()).toBe(nextFollowUp.toDateString());
    });

    it('should list interactions with pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${createdCustomerId}/interactions`)
        .set('Authorization', `Bearer ${accountsToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Customer Follow-ups Checklist Filtering', () => {
    let overdueCustId: string;
    let todayCustId: string;
    let upcomingCustId: string;

    beforeAll(async () => {
      // Overdue customer (follow-up date in past)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 3);

      const odRes = await prisma.customer.create({
        data: {
          name: 'Overdue Client',
          mobile: String(Date.now() + 10).slice(-10),
          customerType: 'RETAIL',
          followUpDate: overdueDate,
          createdById: (await prisma.user.findFirst())!.id,
        },
      });
      overdueCustId = odRes.id;

      // Today customer (follow-up date today)
      const todayDate = new Date();
      todayDate.setHours(12, 0, 0, 0);

      const tRes = await prisma.customer.create({
        data: {
          name: 'Today Client',
          mobile: String(Date.now() + 20).slice(-10),
          customerType: 'WHOLESALE',
          followUpDate: todayDate,
          createdById: (await prisma.user.findFirst())!.id,
        },
      });
      todayCustId = tRes.id;

      // Upcoming customer (follow-up date next 4 days)
      const upcomingDate = new Date();
      upcomingDate.setDate(upcomingDate.getDate() + 4);

      const upRes = await prisma.customer.create({
        data: {
          name: 'Upcoming Client',
          mobile: String(Date.now() + 30).slice(-10),
          customerType: 'DISTRIBUTOR',
          followUpDate: upcomingDate,
          createdById: (await prisma.user.findFirst())!.id,
        },
      });
      upcomingCustId = upRes.id;
    });

    it('should return overdue follow-up customers only', async () => {
      const res = await request(app)
        .get('/api/v1/customers/follow-ups?range=overdue')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((c: any) => c.id);
      expect(ids).toContain(overdueCustId);
      expect(ids).not.toContain(todayCustId);
      expect(ids).not.toContain(upcomingCustId);
    });

    it('should return today follow-up customers only', async () => {
      const res = await request(app)
        .get('/api/v1/customers/follow-ups?range=today')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((c: any) => c.id);
      expect(ids).toContain(todayCustId);
      expect(ids).not.toContain(overdueCustId);
      expect(ids).not.toContain(upcomingCustId);
    });

    it('should return upcoming follow-up customers only', async () => {
      const res = await request(app)
        .get('/api/v1/customers/follow-ups?range=upcoming')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((c: any) => c.id);
      expect(ids).toContain(upcomingCustId);
      expect(ids).not.toContain(overdueCustId);
      expect(ids).not.toContain(todayCustId);
    });
  });
});
