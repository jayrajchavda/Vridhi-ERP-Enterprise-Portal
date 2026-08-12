import { api } from '../../lib/api';

export interface DashboardSummary {
  customers: {
    byStatus: Record<string, number>;
    total: number;
  };
  products: {
    total: number;
    lowStockCount: number;
  };
  challans: {
    DRAFT: number;
    CONFIRMED: number;
    CANCELLED: number;
    confirmedTotalAmount: string;
  };
  recentActivity: {
    stockMovements: any[];
    challans: any[];
  };
}

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await api.get('/dashboard');
  return res.data.data;
};
