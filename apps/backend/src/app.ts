import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { successResponse } from './utils/apiResponse';
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customer.routes';
import productRoutes from './modules/products/product.routes';
import challanRoutes from './modules/challans/challan.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import procurementRoutes from './modules/procurement/procurement.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
import { prisma } from './db/prisma';

const app: Express = express();

// --- Security & Parsing Middlewares ---
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));           // Body size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

// --- API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/challans', challanRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/procurement', procurementRoutes);
app.use('/api/v1', invoicesRoutes);

// --- Health Check (with live DB ping) ---
app.get('/health', async (_req: Request, res: Response) => {
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (_e) {
    dbConnected = false;
  }

  res.status(dbConnected ? 200 : 503).json(
    successResponse({
      status: dbConnected ? 'ok' : 'degraded',
      uptime: process.uptime(),
      dbConnected,
      timestamp: new Date().toISOString(),
    })
  );
});

// --- Fallback & Global Error Handlers ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
