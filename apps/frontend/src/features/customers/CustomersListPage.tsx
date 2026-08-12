import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Filter, Users, Phone, Building2,
  CalendarClock, ChevronLeft, ChevronRight, X, Download
} from 'lucide-react';
import { customersApi, Customer } from './customers.api';
import { exportToCSV } from '../../lib/csvExport';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import { StatusBadge, TypeBadge } from '../../components/Badges';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { formatDate, isOverdue, cn } from '../../lib/utils';
import { useCanAccess } from '../../components/ProtectedRoute';

const PAGE_SIZE = 20;


export const CustomersListPage: React.FC = () => {
  const canWrite = useCanAccess(['ADMIN', 'SALES']);
  const [searchParams] = useSearchParams();

  const [createOpen, setCreateOpen]     = useState(false);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [search, setSearch]             = useState(searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ]     = useState(search);
  const [status, setStatus]             = useState(searchParams.get('status') ?? '');
  const [type, setType]                 = useState(searchParams.get('customerType') ?? '');
  const [page, setPage]                 = useState(1);

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
    }, 350);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', page, debouncedQ, status, type],
    queryFn: () => customersApi.list({
      page,
      limit: PAGE_SIZE,
      q: debouncedQ || undefined,
      status: status || undefined,
      customerType: type || undefined,
    }),
    staleTime: 20_000,
    placeholderData: (prev: any) => prev,
  });

  const customers: Customer[]  = data?.data ?? [];
  const meta                   = data?.meta ?? { page: 1, totalPages: 1, total: 0 };

  const clearFilters = () => {
    setSearch(''); setDebouncedQ('');
    setStatus(''); setType(''); setPage(1);
  };
  const hasFilters = debouncedQ || status || type;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {meta.total > 0 ? `${meta.total} customer${meta.total !== 1 ? 's' : ''} total` : 'Manage your customer base'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="export-customers-csv"
            onClick={() => exportToCSV('customers_export', customers, [
              { key: 'name', label: 'Name' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'email', label: 'Email' },
              { key: 'businessName', label: 'Business' },
              { key: 'customerType', label: 'Type' },
              { key: 'status', label: 'Status' },
            ])}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
          {canWrite && (
            <button
              id="add-customer-btn"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg
                         bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={16} />
              Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Search + Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="customer-search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, mobile, business..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background
                       text-foreground outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground shrink-0" />
          <select
            id="customer-status-filter"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground
                       outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            id="customer-type-filter"
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground
                       outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {isError && (
        <ErrorBanner
          title="Failed to load customers"
          onRetry={() => refetch()}
        />
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <LoadingSkeletonTable rows={8} columns={6} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? 'No customers match your filters' : 'No customers yet'}
            description={hasFilters ? 'Try adjusting your search or filters.' : 'Click "Add Customer" to get started.'}
            action={hasFilters ? (
              <button onClick={clearFilters} className="text-sm text-brand-500 hover:text-brand-600 font-medium">
                Clear filters
              </button>
            ) : undefined}
            className="py-20"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Customer', 'Mobile', 'Business', 'Type', 'Status', 'Follow-up'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => {
                    const overdue = isOverdue(c.followUpDate);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground group-hover:text-brand-600 transition-colors">
                            {c.name}
                          </div>
                          {c.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">{c.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Phone size={12} className="text-muted-foreground" />
                            {c.mobile}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground max-w-[160px] truncate">
                          {c.businessName
                            ? <div className="flex items-center gap-1.5"><Building2 size={12} />{c.businessName}</div>
                            : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <TypeBadge type={c.customerType} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          {c.followUpDate ? (
                            <div className={cn(
                              'flex items-center gap-1.5 text-xs font-medium',
                              overdue ? 'text-danger' : 'text-muted-foreground'
                            )}>
                              <CalendarClock size={12} />
                              {overdue && <span className="font-bold">OVERDUE</span>}
                              {formatDate(c.followUpDate)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} · {meta.total} results
                </p>
                <div className="flex items-center gap-1">
                  <button
                    id="customers-prev-page"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                    const n = i + 1;
                    return (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={cn(
                          'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                          n === meta.page
                            ? 'bg-brand-500 text-white'
                            : 'hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                  <button
                    id="customers-next-page"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals/Drawers */}
      <CustomerFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <CustomerDetailDrawer customerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
};
