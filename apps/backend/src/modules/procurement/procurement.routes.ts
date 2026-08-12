import { Router } from 'express';
import { ProcurementController } from './procurement.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createVendorSchema,
  updateVendorSchema,
  queryVendorSchema,
  createPurchaseOrderSchema,
  queryPurchaseOrderSchema,
  createPurchaseReceiptSchema,
  queryPurchaseReceiptSchema,
} from './procurement.schemas';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All procurement routes require authentication
router.use(authenticate);

// --- Vendor Routes ---
router.get(
  '/vendors',
  validate({ query: queryVendorSchema }),
  asyncHandler(ProcurementController.getVendors)
);

router.get(
  '/vendors/:id',
  asyncHandler(ProcurementController.getVendorById)
);

router.post(
  '/vendors',
  authorize('ADMIN', 'WAREHOUSE'),
  validate({ body: createVendorSchema }),
  asyncHandler(ProcurementController.createVendor)
);

router.patch(
  '/vendors/:id',
  authorize('ADMIN', 'WAREHOUSE'),
  validate({ body: updateVendorSchema }),
  asyncHandler(ProcurementController.updateVendor)
);

// --- Purchase Order Routes ---
router.get(
  '/purchase-orders/suggestions',
  asyncHandler(ProcurementController.getReorderSuggestions)
);

router.get(
  '/purchase-orders',
  validate({ query: queryPurchaseOrderSchema }),
  asyncHandler(ProcurementController.getPurchaseOrders)
);

router.get(
  '/purchase-orders/:id',
  asyncHandler(ProcurementController.getPurchaseOrderById)
);

// Get PO PDF
router.get(
  '/purchase-orders/:id/pdf',
  asyncHandler(ProcurementController.getPoPdf)
);

router.post(
  '/purchase-orders',
  authorize('ADMIN', 'WAREHOUSE'),
  validate({ body: createPurchaseOrderSchema }),
  asyncHandler(ProcurementController.createPurchaseOrder)
);

router.post(
  '/purchase-orders/:id/send',
  authorize('ADMIN', 'WAREHOUSE'),
  asyncHandler(ProcurementController.sendPurchaseOrder)
);

router.post(
  '/purchase-orders/:id/cancel',
  authorize('ADMIN', 'WAREHOUSE'),
  asyncHandler(ProcurementController.cancelPurchaseOrder)
);

// --- Purchase Receipt Routes ---
router.get(
  '/purchase-receipts',
  validate({ query: queryPurchaseReceiptSchema }),
  asyncHandler(ProcurementController.getPurchaseReceipts)
);

router.get(
  '/purchase-receipts/:id',
  asyncHandler(ProcurementController.getPurchaseReceiptById)
);

router.post(
  '/purchase-receipts',
  authorize('ADMIN', 'WAREHOUSE'),
  validate({ body: createPurchaseReceiptSchema }),
  asyncHandler(ProcurementController.createPurchaseReceipt)
);

export default router;
