import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  queryProductSchema,
  createStockMovementSchema,
} from './product.schemas';
import { Role } from '../../types/domain';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All product routes require authentication
router.use(authenticate);

// List Products (Admin, Warehouse, Sales, Accounts)
router.get(
  '/',
  authorize(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  validate({ query: queryProductSchema }),
  asyncHandler(ProductController.getProducts)
);

// Low Stock Alert Products (Admin, Warehouse, Sales, Accounts)
router.get(
  '/low-stock',
  authorize(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  asyncHandler(ProductController.getLowStockProducts)
);

// Create Product (Admin, Warehouse Only)
router.post(
  '/',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate({ body: createProductSchema }),
  asyncHandler(ProductController.createProduct)
);

// Get Product Detail (Admin, Warehouse, Sales, Accounts)
router.get(
  '/:id',
  authorize(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  asyncHandler(ProductController.getProductById)
);

// Update Product (Admin, Warehouse Only)
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate({ body: updateProductSchema }),
  asyncHandler(ProductController.updateProduct)
);

// Manually Log Stock Movement (Admin, Warehouse Only)
router.post(
  '/:id/stock-movements',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate({ body: createStockMovementSchema }),
  asyncHandler(ProductController.logStockMovement)
);

// Get Stock Movement History for Product (Admin, Warehouse, Sales, Accounts)
router.get(
  '/:id/stock-movements',
  authorize(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  asyncHandler(ProductController.getProductStockMovements)
);

export default router;
