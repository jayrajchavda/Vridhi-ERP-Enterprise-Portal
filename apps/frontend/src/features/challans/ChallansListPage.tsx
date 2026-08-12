import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, FileText, Calendar,
  ChevronLeft, ChevronRight, X, Eye, Edit2, Download
} from 'lucide-react';
import { challansApi, SalesChallan } from './challans.api';
import { exportToCSV } from '../../lib/csvExport';
import { ChallanFormModal } from './ChallanFormModal';
import { ChallanDetailModal } from './ChallanDetailModal';
import { StatusBadge } from '../../components/Badges';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { useCanAccess } from '../../components/ProtectedRoute';

const PAGE_SIZE = 20;

export const ChallansListPage: React.FC = () => {
  const canCreate = useCanAccess(['ADMIN', 'SALES']);
  const [searchParams] = useSearchParams();

  const [createOpen, setCreateOpen]         = useState(false);
  const [editChallan, setEditChallan]       = useState<SalesChallan | null>(null);
  const [selectedId, setSelectedId]         = useState<string | null>(null);

  const [status, setStatus]                 = useState(searchParams.get('status') ?? '');
  const [customerId]                        = useState(searchParams.get('customerId') ?? '');
  const [startDate, setStartDate]           = useState(searchParams.get('startDate') ?? '');
  const [endDate, setEndDate]               = useState(searchParams.get('endDate') ?? '');
  const [page, setPage]                     = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['challans', page, status, customerId, startDate, endDate],
    queryFn: () => challansApi.list({
      page,
      limit: PAGE_SIZE,
      status: status || undefined,
      customerId: customerId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    staleTime: 15_000,
    placeholderData: (prev: any) => prev,
  });

  const challans: SalesChallan[] = data?.data ?? [];
  const meta                     = data?.meta ?? { page: 1, totalPages: 1, total: 0 };

  const clearFilters = () => {
    setStatus(''); setStartDate(''); setEndDate(''); setPage(1);
  };
  const hasFilters = status || customerId || startDate || endDate;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Challans</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {meta.total > 0 ? `${meta.total} delivery challan${meta.total !== 1 ? 's' : ''}` : 'Manage sales challans & stock deductions'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="export-challans-csv"
            onClick={() => exportToCSV(
              'sales_challans_export',
              challans.map((c) => ({
                ...c,
                customerName: c.customer?.name || '',
                lineItemsCount: c.items?.length || 0,
              })),
              [
                { key: 'challanNumber' as any, label: 'Challan #' },
                { key: 'customerName' as any, label: 'Customer' },
                { key: 'status' as any, label: 'Status' },
                { key: 'totalQuantity' as any, label: 'Total Qty' },
                { key: 'totalAmount' as any, label: 'Total Amount' },
                { key: 'createdAt' as any, label: 'Date' },
              ]
            )}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
          {canCreate && (
            <button
              id="create-challan-btn"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={16} /> Create Challan
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Date Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          {[
            { label: 'All', value: '' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Confirmed', value: 'CONFIRMED' },
            { label: 'Cancelled', value: 'CANCELLED' },
          ].map((tab) => (
            <button
              key={tab.value}
              id={`filter-tab-${tab.value || 'all'}`}
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                status === tab.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-lg">
            <Calendar size={13} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="bg-transparent text-foreground outline-none cursor-pointer"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="bg-transparent text-foreground outline-none cursor-pointer"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {isError && (
        <ErrorBanner title="Failed to load sales challans" onRetry={() => refetch()} />
      )}

      {/* Challans Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <LoadingSkeletonTable rows={8} columns={6} />
        ) : challans.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasFilters ? 'No challans found matching filters' : 'No sales challans created yet'}
            description={hasFilters ? 'Try resetting date range or status filters.' : 'Click "Create Challan" to generate a delivery challan.'}
            action={hasFilters ? (
              <button onClick={clearFilters} className="text-sm text-brand-500 hover:text-brand-600 font-medium">
                Reset filters
              </button>
            ) : undefined}
            className="py-20"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Challan #</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {challans.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 font-bold font-mono text-foreground group-hover:text-brand-600">
                        {c.challanNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{c.customer?.name || '—'}</div>
                        {c.customer?.businessName && (
                          <div className="text-xs text-muted-foreground">{c.customer.businessName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">
                        {c.items?.length || c.totalQuantity} line items
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-foreground">
                        {formatCurrency(c.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`view-challan-${c.id}`}
                            onClick={() => setSelectedId(c.id)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="View Challan Details"
                          >
                            <Eye size={15} />
                          </button>

                          {canCreate && c.status === 'DRAFT' && (
                            <button
                              id={`edit-challan-${c.id}`}
                              onClick={() => setEditChallan(c)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Edit Draft Challan"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} · {meta.total} results
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals & Detail Views */}
      <ChallanFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editChallan && (
        <ChallanFormModal
          open={Boolean(editChallan)}
          onClose={() => setEditChallan(null)}
          existing={editChallan}
        />
      )}
      <ChallanDetailModal challanId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
};
