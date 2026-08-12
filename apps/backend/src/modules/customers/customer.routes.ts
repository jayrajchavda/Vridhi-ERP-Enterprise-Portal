import { Router } from 'express';
import { CustomerController } from './customer.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCustomerSchema,
  updateCustomerSchema,
  queryCustomerSchema,
  createNoteSchema,
  createInteractionSchema,
} from './customer.schemas';
import { Role } from '../../types/domain';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

// List Customers (Admin, Sales, Accounts)
router.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  validate({ query: queryCustomerSchema }),
  asyncHandler(CustomerController.getCustomers)
);

// Create Customer (Admin, Sales)
router.post(
  '/',
  authorize(Role.ADMIN, Role.SALES),
  validate({ body: createCustomerSchema }),
  asyncHandler(CustomerController.createCustomer)
);

// Get Follow-ups Checklist (Admin, Sales only)
router.get(
  '/follow-ups',
  authorize(Role.ADMIN, Role.SALES),
  asyncHandler(CustomerController.getFollowUps)
);

// Get Customer Detail (Admin, Sales, Accounts)
router.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  asyncHandler(CustomerController.getCustomerById)
);

// Update Customer (Admin, Sales)
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.SALES),
  validate({ body: updateCustomerSchema }),
  asyncHandler(CustomerController.updateCustomer)
);

// Delete Customer (Admin Only)
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  asyncHandler(CustomerController.deleteCustomer)
);

// Add Customer Follow-up Note (Admin, Sales)
router.post(
  '/:id/notes',
  authorize(Role.ADMIN, Role.SALES),
  validate({ body: createNoteSchema }),
  asyncHandler(CustomerController.addNote)
);

// Get Customer Notes (Admin, Sales, Accounts)
router.get(
  '/:id/notes',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  asyncHandler(CustomerController.getNotes)
);

// Add Customer Interaction Log (Admin, Sales only)
router.post(
  '/:id/interactions',
  authorize(Role.ADMIN, Role.SALES),
  validate({ body: createInteractionSchema }),
  asyncHandler(CustomerController.createInteraction)
);

// Get Customer Interaction Logs (Admin, Sales, Accounts)
router.get(
  '/:id/interactions',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  asyncHandler(CustomerController.getInteractions)
);

export default router;
