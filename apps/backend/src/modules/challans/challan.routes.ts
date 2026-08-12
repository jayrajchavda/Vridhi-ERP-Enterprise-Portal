import { Router } from 'express';
import { ChallanController } from './challan.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createChallanSchema,
  updateChallanSchema,
  queryChallanSchema,
} from './challan.schemas';
import { Role } from '../../types/domain';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All challan routes require authentication
router.use(authenticate);

// List Challans (all roles)
router.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  validate({ query: queryChallanSchema }),
  asyncHandler(ChallanController.getChallans)
);

// Create Challan (Admin, Sales only)
router.post(
  '/',
  authorize(Role.ADMIN, Role.SALES),
  validate({ body: createChallanSchema }),
  asyncHandler(ChallanController.createChallan)
);

// Get Challan Detail (all roles)
router.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  asyncHandler(ChallanController.getChallanById)
);

// Get Challan PDF (all roles)
router.get(
  '/:id/pdf',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  asyncHandler(ChallanController.getPdf)
);

// Update Draft Challan (Admin, Sales only)
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.SALES),
  validate({ body: updateChallanSchema }),
  asyncHandler(ChallanController.updateChallan)
);

// Confirm Challan: Draft → Confirmed (Admin, Sales only)
router.post(
  '/:id/confirm',
  authorize(Role.ADMIN, Role.SALES),
  asyncHandler(ChallanController.confirmChallan)
);

// Cancel Challan (Admin, Sales only)
router.post(
  '/:id/cancel',
  authorize(Role.ADMIN, Role.SALES),
  asyncHandler(ChallanController.cancelChallan)
);

export default router;
