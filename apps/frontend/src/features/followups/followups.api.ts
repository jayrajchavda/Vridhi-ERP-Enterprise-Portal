import { api } from '../../lib/api';

export interface FollowUpCustomer {
  id: string;
  name: string;
  mobile: string;
  businessName?: string;
  status: string;
  followUpDate: string;
  lastInteraction?: {
    notes: string;
    createdAt: string;
  } | null;
}

export interface InteractionLog {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING';
  notes: string;
  createdAt: string;
  createdBy: { name: string; email: string };
}

export const followupsApi = {
  listFollowUps: async (range: 'overdue' | 'today' | 'upcoming') => {
    const res = await api.get('/customers/follow-ups', { params: { range } });
    return res.data;
  },
  createInteraction: async (customerId: string, data: { type: string; notes: string; nextFollowUpDate?: string | null }) => {
    const res = await api.post(`/customers/${customerId}/interactions`, data);
    return res.data;
  },
  listInteractions: async (customerId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get(`/customers/${customerId}/interactions`, { params });
    return res.data;
  },
};
