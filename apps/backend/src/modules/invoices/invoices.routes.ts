import { Router } from 'express';
import { InvoicesController } from './invoices.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { queryInvoiceSchema, createPaymentSchema } from './invoices.schemas';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All billing/invoicing routes require authentication
router.use(authenticate);

// POST /challans/:id/convert-to-invoice (Admin, Accounts only)
router.post(
  '/challans/:id/convert-to-invoice',
  authorize('ADMIN', 'ACCOUNTS'),
  asyncHandler(InvoicesController.convertChallanToInvoice)
);

// GET /invoices
router.get(
  '/invoices',
  validate({ query: queryInvoiceSchema }),
  asyncHandler(InvoicesController.getInvoices)
);

// GET /invoices/:id
router.get(
  '/invoices/:id',
  asyncHandler(InvoicesController.getInvoiceById)
);

// GET /invoices/:id/pdf
router.get(
  '/invoices/:id/pdf',
  asyncHandler(InvoicesController.getPdf)
);

// POST /invoices/:id/payments (Admin, Accounts only)
router.post(
  '/invoices/:id/payments',
  authorize('ADMIN', 'ACCOUNTS'),
  validate({ body: createPaymentSchema }),
  asyncHandler(InvoicesController.recordPayment)
);

// GET /invoices/:id/payments
router.get(
  '/invoices/:id/payments',
  asyncHandler(InvoicesController.getPaymentsForInvoice)
);

export default router;
