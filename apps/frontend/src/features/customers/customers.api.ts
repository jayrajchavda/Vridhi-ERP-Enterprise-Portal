import { api } from '../../lib/api';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { challans: number };
}

export interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  customerType?: string;
}

export const customersApi = {
  list: (params: CustomerListParams) =>
    api.get('/customers', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get(`/customers/${id}`).then((r) => r.data.data),

  create: (body: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | '_count'>) =>
    api.post('/customers', body).then((r) => r.data.data),

  update: (id: string, body: Partial<Customer>) =>
    api.patch(`/customers/${id}`, body).then((r) => r.data.data),

  getNotes: (id: string) =>
    api.get(`/customers/${id}/notes`).then((r) => r.data.data as CustomerNote[]),

  addNote: (id: string, note: string) =>
    api.post(`/customers/${id}/notes`, { note }).then((r) => r.data.data),
};
