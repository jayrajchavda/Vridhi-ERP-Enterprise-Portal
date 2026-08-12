import { api } from '../../lib/api';

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendor: Vendor;
  status: 'DRAFT' | 'SENT' | 'COMPLETED' | 'CANCELLED';
  totalAmount: string;
  createdById: string;
  createdBy: { name: string };
  createdAt: string;
  items: PurchaseOrderItem[];
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStockAlert: number;
  suggestedQty: number;
  lastPurchasePrice?: string;
}

export const procurementApi = {
  // --- Vendors ---
  listVendors: async (params?: { q?: string; page?: number; limit?: number }) => {
    const res = await api.get('/procurement/vendors', { params });
    return res.data;
  },
  getVendor: async (id: string) => {
    const res = await api.get(`/procurement/vendors/${id}`);
    return res.data;
  },
  createVendor: async (data: Partial<Vendor>) => {
    const res = await api.post('/procurement/vendors', data);
    return res.data;
  },
  updateVendor: async (id: string, data: Partial<Vendor>) => {
    const res = await api.patch(`/procurement/vendors/${id}`, data);
    return res.data;
  },

  // --- Reorder Suggestions ---
  getReorderSuggestions: async () => {
    const res = await api.get('/procurement/purchase-orders/suggestions');
    return res.data;
  },

  // --- Purchase Orders ---
  listPurchaseOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get('/procurement/purchase-orders', { params });
    return res.data;
  },
  getPurchaseOrder: async (id: string) => {
    const res = await api.get(`/procurement/purchase-orders/${id}`);
    return res.data;
  },
  createPurchaseOrder: async (data: { vendorId: string; items: { productId: string; quantityOrdered: number; unitCost: string }[] }) => {
    const res = await api.post('/procurement/purchase-orders', data);
    return res.data;
  },
  sendPurchaseOrder: async (id: string) => {
    const res = await api.post(`/procurement/purchase-orders/${id}/send`);
    return res.data;
  },
  cancelPurchaseOrder: async (id: string) => {
    const res = await api.post(`/procurement/purchase-orders/${id}/cancel`);
    return res.data;
  },

  // --- Receipts ---
  listPurchaseReceipts: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get('/procurement/purchase-receipts', { params });
    return res.data;
  },
  getPurchaseReceipt: async (id: string) => {
    const res = await api.get(`/procurement/purchase-receipts/${id}`);
    return res.data;
  },
  createPurchaseReceipt: async (data: { poId: string; deliveryChallanRef?: string; items: { poItemId: string; quantityReceived: number }[] }) => {
    const res = await api.post('/procurement/purchase-receipts', data);
    return res.data;
  },

  // --- Download PO PDF ---
  downloadPoPdfUrl: (id: string) => {
    const token = localStorage.getItem('token');
    return `${api.defaults.baseURL}/procurement/purchase-orders/${id}/pdf?token=${token}`;
  },
};
