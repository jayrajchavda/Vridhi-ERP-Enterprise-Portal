import { api } from '../../lib/api';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  movementType: 'IN' | 'OUT';
  quantityChanged: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  lowStock?: boolean;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const productsApi = {
  list: (params: ProductListParams) =>
    api.get('/products', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get(`/products/${id}`).then((r) => r.data.data as Product),

  create: (body: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post('/products', body).then((r) => r.data.data as Product),

  update: (id: string, body: Partial<Product>) =>
    api.patch(`/products/${id}`, body).then((r) => r.data.data as Product),

  getLowStock: () =>
    api.get('/products/low-stock').then((r) => r.data.data as Product[]),

  getMovements: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/products/${id}/stock-movements`, { params }).then((r) => r.data),

  applyMovement: (id: string, body: { movementType: 'IN' | 'OUT'; quantityChanged: number; reason: string }) =>
    api.post(`/products/${id}/stock-movements`, body).then((r) => r.data.data as Product),
};
