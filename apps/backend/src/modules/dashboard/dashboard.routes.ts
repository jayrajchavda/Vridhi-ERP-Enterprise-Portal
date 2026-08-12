import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { successResponse } from '../../utils/apiResponse';
import { prisma } from '../../db/prisma';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    customersByStatus,
    totalProducts,
    lowStockProducts,
    challanCountsThisMonth,
    recentStockMovements,
    recentChallans,
  ] = await Promise.all([
    // Customers by status
    prisma.customer.groupBy({
      by: ['status'],
      _count: { status: true },
    }),

    // Total product count
    prisma.product.count(),

    // Low-stock count
    prisma.product.findMany({
      select: { id: true, currentStock: true, minStockAlert: true },
    }),

    // Challan summary this month
    prisma.salesChallan.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { totalAmount: true },
      where: { createdAt: { gte: startOfMonth } },
    }),

    // Recent stock movements (last 10)
    prisma.stockMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),

    // Recent challans (last 10)
    prisma.salesChallan.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        challanNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { id: true, name: true } },
      },
    }),
  ]);

  const lowStockCount = lowStockProducts.filter(
    (p) => p.currentStock <= p.minStockAlert
  ).length;

  // Normalize challan summaries
  const challanSummary = {
    DRAFT: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
    confirmedTotalAmount: '0',
  };
  for (const row of challanCountsThisMonth) {
    if (row.status === 'DRAFT') challanSummary.DRAFT = row._count.status;
    if (row.status === 'CONFIRMED') {
      challanSummary.CONFIRMED = row._count.status;
      challanSummary.confirmedTotalAmount = row._sum.totalAmount?.toString() ?? '0';
    }
    if (row.status === 'CANCELLED') challanSummary.CANCELLED = row._count.status;
  }

  const customerSummary: Record<string, number> = {};
  for (const row of customersByStatus) {
    customerSummary[row.status] = row._count.status;
  }

  res.json(
    successResponse({
      customers: {
        byStatus: customerSummary,
        total: Object.values(customerSummary).reduce((a, b) => a + b, 0),
      },
      products: {
        total: totalProducts,
        lowStockCount,
      },
      challans: challanSummary,
      recentActivity: {
        stockMovements: recentStockMovements.map((m) => ({
          ...m,
          _type: 'stockMovement',
        })),
        challans: recentChallans.map((c) => ({
          ...c,
          totalAmount: c.totalAmount.toString(),
          _type: 'challan',
        })),
      },
    })
  );
}));

export default router;
