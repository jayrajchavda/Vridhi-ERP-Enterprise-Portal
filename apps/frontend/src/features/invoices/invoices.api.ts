import { api } from '../../lib/api';

export interface InvoicePayment {
  id: string;
  amount: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE';
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  createdBy: { name: string };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  challanId: string;
  customerId: string;
  customer: {
    name: string;
    mobile: string;
    email?: string;
    state?: string;
    gstNumber?: string;
    businessName?: string;
  };
  challan: {
    challanNumber: string;
    items: Array<{
      id: string;
      productNameSnapshot: string;
      skuSnapshot: string;
      quantity: number;
      unitPriceSnapshot: string;
      lineTotal: string;
    }>;
  };
  subtotal: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  createdAt: string;
  createdBy: { name: string };
}

export const invoicesApi = {
  listInvoices: async (params?: { status?: string; customerId?: string; page?: number; limit?: number }) => {
    const res = await api.get('/invoices', { params });
    return res.data;
  },
  getInvoice: async (id: string) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },
  convertChallan: async (challanId: string) => {
    const res = await api.post(`/challans/${challanId}/convert-to-invoice`);
    return res.data;
  },
  recordPayment: async (invoiceId: string, data: { amount: string; paymentMode: string; referenceNumber?: string; notes?: string }) => {
    const res = await api.post(`/invoices/${invoiceId}/payments`, data);
    return res.data;
  },
  getPayments: async (invoiceId: string) => {
    const res = await api.get(`/invoices/${invoiceId}/payments`);
    return res.data;
  },
  downloadInvoicePdfUrl: (id: string) => {
    const token = localStorage.getItem('token');
    return `${api.defaults.baseURL}/invoices/${id}/pdf?token=${token}`;
  },
};
