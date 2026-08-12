import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Filter, Eye } from 'lucide-react';
import { invoicesApi, Invoice } from './invoices.api';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices', status, page],
    queryFn: () => invoicesApi.listInvoices({ status: status || undefined, page, limit: 15 }),
  });

  const invoices: Invoice[] = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, totalPages: 1, total: 0 };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'UNPAID': return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      case 'PARTIALLY_PAID': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'PAID': return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tax Invoices</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage tax invoicing, GST reporting, and payments tracking
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment status:</span>
          <div className="flex items-center gap-1.5 ml-1">
            {['', 'UNPAID', 'PARTIALLY_PAID', 'PAID'].map((st) => (
              <button
                key={st}
                onClick={() => { setStatus(st); setPage(1); }}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full border transition-all',
                  status === st
                    ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                    : 'bg-background hover:bg-muted border-border text-muted-foreground'
                )}
              >
                {st === '' ? 'All Invoices' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      {isLoading ? (
        <LoadingSkeletonTable />
      ) : isError ? (
        <ErrorBanner message="Failed to load invoices list" />
      ) : invoices.length === 0 ? (
        <EmptyState title="No Invoices Found" description="Tax invoices are automatically created from sales challans." />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Challan Ref</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Invoice Total</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono font-bold text-brand-500">
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{inv.customer.name}</div>
                      {inv.customer.businessName && (
                        <div className="text-xs text-muted-foreground">{inv.customer.businessName}</div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {inv.challan.challanNumber}
                    </td>
                    <td className="p-4">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {formatCurrency(Number(inv.totalAmount))}
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider', getStatusColor(inv.status))}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="p-1.5 text-muted-foreground hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Eye size={15} />
                        View Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Showing page {meta.page} of {meta.totalPages} ({meta.total} invoices total)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg bg-background hover:bg-muted text-foreground transition-all disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page === meta.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg bg-background hover:bg-muted text-foreground transition-all disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
