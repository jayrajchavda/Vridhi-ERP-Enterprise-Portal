import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Filter, Package, AlertTriangle,
  ArrowUpDown, ChevronLeft, ChevronRight, X, Download
} from 'lucide-react';
import { productsApi, Product } from './products.api';
import { exportToCSV } from '../../lib/csvExport';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { StockAdjustModal } from './StockAdjustModal';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency, cn } from '../../lib/utils';
import { useCanAccess } from '../../components/ProtectedRoute';

const PAGE_SIZE = 20;

export const ProductsListPage: React.FC = () => {
  const canWrite = useCanAccess(['ADMIN', 'WAREHOUSE']);
  const [searchParams] = useSearchParams();

  const [createOpen, setCreateOpen]         = useState(false);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [adjustProduct, setAdjustProduct]   = useState<Product | null>(null);

  const [search, setSearch]                 = useState(searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ]         = useState(search);
  const [category, setCategory]             = useState(searchParams.get('category') ?? '');
  const [lowStockOnly, setLowStockOnly]     = useState(searchParams.get('lowStock') === 'true');
  const [page, setPage]                     = useState(1);

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
    queryKey: ['products', page, debouncedQ, category, lowStockOnly],
    queryFn: () => productsApi.list({
      page,
      limit: PAGE_SIZE,
      q: debouncedQ || undefined,
      category: category || undefined,
      lowStock: lowStockOnly || undefined,
    }),
    staleTime: 20_000,
    placeholderData: (prev: any) => prev,
  });

  const products: Product[] = data?.data ?? [];
  const meta               = data?.meta ?? { page: 1, totalPages: 1, total: 0 };

  const clearFilters = () => {
    setSearch(''); setDebouncedQ('');
    setCategory(''); setLowStockOnly(false); setPage(1);
  };
  const hasFilters = debouncedQ || category || lowStockOnly;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products & Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {meta.total > 0 ? `${meta.total} product${meta.total !== 1 ? 's' : ''} total` : 'Manage inventory and stock levels'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="export-products-csv"
            onClick={() => exportToCSV('products_export', products, [
              { key: 'name', label: 'Product Name' },
              { key: 'sku', label: 'SKU' },
              { key: 'category', label: 'Category' },
              { key: 'unitPrice', label: 'Unit Price' },
              { key: 'currentStock', label: 'Current Stock' },
              { key: 'minStockAlert', label: 'Min Stock Alert' },
            ])}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
          {canWrite && (
            <button
              id="add-product-btn"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg
                         bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={16} />
              Add Product
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
            id="product-search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, SKU, category..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background
                       text-foreground outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground shrink-0" />
          <input
            id="product-category-filter"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            placeholder="Filter category..."
            className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground
                       outline-none focus:ring-2 focus:ring-brand-500/30 max-w-[140px]"
          />
        </div>

        {/* Low Stock Toggle Pill */}
        <button
          id="low-stock-toggle"
          onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
            lowStockOnly
              ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          )}
        >
          <AlertTriangle size={14} className={lowStockOnly ? 'text-amber-600 dark:text-amber-400' : ''} />
          Low Stock Only
        </button>

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
          title="Failed to load products"
          onRetry={() => refetch()}
        />
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <LoadingSkeletonTable rows={8} columns={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={hasFilters ? 'No products match your filters' : 'No products in inventory yet'}
            description={hasFilters ? 'Try adjusting your search or filters.' : 'Click "Add Product" to add your first product.'}
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
                    {['Product', 'SKU', 'Category', 'Unit Price', 'Current Stock', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => {
                    const isLow = p.currentStock <= p.minStockAlert;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground group-hover:text-brand-600 transition-colors">
                            {p.name}
                          </div>
                          {p.location && (
                            <div className="text-xs text-muted-foreground">Loc: {p.location}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-foreground">
                          {formatCurrency(p.unitPrice)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-bold text-sm',
                              isLow ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                            )}>
                              {p.currentStock}
                            </span>
                            {isLow && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                <AlertTriangle size={11} /> Low Stock (min {p.minStockAlert})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {canWrite && (
                            <button
                              id={`adjust-stock-${p.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdjustProduct(p);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg
                                         border border-border hover:bg-brand-50 hover:border-brand-300
                                         dark:hover:bg-brand-900/20 text-foreground transition-colors"
                              title="Adjust stock level"
                            >
                              <ArrowUpDown size={12} />
                              Adjust
                            </button>
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
                    id="products-prev-page"
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
                    id="products-next-page"
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

      {/* Modals & Drawers */}
      <ProductFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ProductDetailDrawer productId={selectedId} onClose={() => setSelectedId(null)} />
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          open={Boolean(adjustProduct)}
          onClose={() => setAdjustProduct(null)}
        />
      )}
    </div>
  );
};
