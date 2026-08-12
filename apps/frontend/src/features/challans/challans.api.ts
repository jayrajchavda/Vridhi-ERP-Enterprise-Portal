import { api } from '../../lib/api';

export interface ChallanItem {
  id?: string;
  productId: string;
  quantity: number;
  unitPriceSnapshot?: string;
  productNameSnapshot?: string;
  skuSnapshot?: string;
  lineTotal?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unitPrice: string;
    currentStock: number;
  };
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  totalAmount: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    mobile: string;
    email?: string;
    businessName?: string;
    gstNumber?: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  items: ChallanItem[];
}

export interface ChallanListParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateChallanInput {
  customerId: string;
  status?: 'DRAFT' | 'CONFIRMED';
  items: { productId: string; quantity: number }[];
}

export const challansApi = {
  list: (params: ChallanListParams) =>
    api.get('/challans', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get(`/challans/${id}`).then((r) => r.data.data as SalesChallan),

  create: (body: CreateChallanInput) =>
    api.post('/challans', body).then((r) => r.data.data as SalesChallan),

  update: (id: string, body: Partial<CreateChallanInput>) =>
    api.patch(`/challans/${id}`, body).then((r) => r.data.data as SalesChallan),

  confirm: (id: string) =>
    api.post(`/challans/${id}/confirm`).then((r) => r.data.data as SalesChallan),

  cancel: (id: string) =>
    api.post(`/challans/${id}/cancel`).then((r) => r.data.data as SalesChallan),
};
