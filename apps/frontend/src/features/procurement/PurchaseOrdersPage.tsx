import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Filter, Eye, AlertCircle } from 'lucide-react';
import { procurementApi, PurchaseOrder } from './procurement.api';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

export const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-orders', status, page],
    queryFn: () => procurementApi.listPurchaseOrders({ status: status || undefined, page, limit: 15 }),
  });

  const orders: PurchaseOrder[] = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, totalPages: 1, total: 0 };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20';
      case 'SENT': return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'CANCELLED': return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders (PO)</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create, track and receive incoming supply shipments
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/procurement/suggestions')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
          >
            <AlertCircle size={15} />
            Reorder Suggestions
          </button>
          <button
            id="new-po-btn"
            onClick={() => navigate('/procurement/purchase-orders/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm"
          >
            <FilePlus size={16} />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
          <div className="flex items-center gap-1.5 ml-1">
            {['', 'DRAFT', 'SENT', 'COMPLETED', 'CANCELLED'].map((st) => (
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
                {st === '' ? 'All Orders' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <LoadingSkeletonTable />
      ) : isError ? (
        <ErrorBanner message="Failed to load purchase orders list" />
      ) : orders.length === 0 ? (
        <EmptyState title="No Purchase Orders" description="No PO documents found matching your filter selection." />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Supplier / Vendor</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-foreground">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono font-bold text-brand-500">
                      {po.poNumber}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{po.vendor.name}</div>
                      {po.vendor.contactPerson && (
                        <div className="text-xs text-muted-foreground">{po.vendor.contactPerson}</div>
                      )}
                    </td>
                    <td className="p-4">
                      {new Date(po.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-4 font-semibold">
                      {formatCurrency(Number(po.totalAmount))}
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider', getStatusColor(po.status))}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}
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
                Showing page {meta.page} of {meta.totalPages} ({meta.total} orders total)
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
