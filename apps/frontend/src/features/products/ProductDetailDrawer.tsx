import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Edit2, ArrowUpDown, ArrowUpCircle, ArrowDownCircle,
  Package, MapPin, Tag, DollarSign, ChevronLeft, ChevronRight
} from 'lucide-react';
import { productsApi, Product, StockMovement } from './products.api';
import { ProductFormModal } from './ProductFormModal';
import { StockAdjustModal } from './StockAdjustModal';
import { formatCurrency, formatDateTime, cn } from '../../lib/utils';
import { useCanAccess } from '../../components/ProtectedRoute';

interface ProductDetailDrawerProps {
  productId: string | null;
  onClose: () => void;
}

const StockBar: React.FC<{ current: number; min: number }> = ({ current, min }) => {
  const isLow = current <= min;
  const pct   = min === 0 ? 100 : Math.min(100, Math.round((current / (min * 3)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className={cn('font-semibold', isLow ? 'text-warning' : 'text-success')}>
          {current} units in stock
        </span>
        <span className="text-muted-foreground">Min alert: {min}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', isLow ? 'bg-warning' : 'bg-success')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({ productId, onClose }) => {
  const canWrite      = useCanAccess(['ADMIN', 'WAREHOUSE']);
  const [editOpen, setEditOpen]     = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [movPage, setMovPage]       = useState(1);

  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: ['product', productId],
    queryFn: () => productsApi.get(productId!),
    enabled: Boolean(productId),
    staleTime: 15_000,
  });

  const { data: movementsData, isLoading: movLoading } = useQuery({
    queryKey: ['product-movements', productId, movPage],
    queryFn: () => productsApi.getMovements(productId!, { page: movPage, limit: 10 }),
    enabled: Boolean(productId),
    staleTime: 10_000,
  });

  const movements: StockMovement[] = movementsData?.data ?? [];
  const movMeta = movementsData?.meta ?? { page: 1, totalPages: 1, total: 0 };

  if (!productId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          {productLoading ? (
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          ) : product ? (
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">{product.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{product.sku}</span>
                <span className="text-xs text-muted-foreground">{product.category}</span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 ml-3 shrink-0">
            {canWrite && product && (
              <>
                <button
                  id="product-adjust-btn"
                  onClick={() => setAdjustOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                             border border-brand-300 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  <ArrowUpDown size={13} />
                  Adjust Stock
                </button>
                <button
                  id="product-edit-btn"
                  onClick={() => setEditOpen(true)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 size={15} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {productLoading && (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
            </div>
          )}

          {product && (
            <div className="p-6 space-y-6">
              {/* Stock level bar */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Stock Level</h3>
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <StockBar current={product.currentStock} min={product.minStockAlert} />
                  {product.currentStock <= product.minStockAlert && (
                    <p className="text-xs text-warning mt-2 font-medium">⚠ Below minimum stock alert threshold</p>
                  )}
                </div>
              </section>

              {/* Product details */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Details</h3>
                <div className="space-y-2">
                  <InfoRow icon={DollarSign} label="Unit Price" value={formatCurrency(product.unitPrice)} />
                  <InfoRow icon={Tag} label="Category" value={product.category} />
                  {product.location && <InfoRow icon={MapPin} label="Location" value={product.location} />}
                  <InfoRow icon={Package} label="Min Stock Alert" value={`${product.minStockAlert} units`} />
                </div>
              </section>

              {/* Stock movement history */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Movement History
                    {movMeta.total > 0 && <span className="ml-1.5 text-muted-foreground/60">({movMeta.total})</span>}
                  </h3>
                </div>

                {movLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
                  </div>
                ) : movements.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No stock movements yet</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {movements.map((m) => (
                        <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                          <div className={cn(
                            'mt-0.5 p-1 rounded-full shrink-0',
                            m.movementType === 'IN'
                              ? 'bg-success/10 text-success'
                              : 'bg-danger/10 text-danger'
                          )}>
                            {m.movementType === 'IN'
                              ? <ArrowUpCircle size={14} />
                              : <ArrowDownCircle size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={cn('text-sm font-semibold', m.movementType === 'IN' ? 'text-success' : 'text-danger')}>
                                {m.movementType === 'IN' ? '+' : '-'}{m.quantityChanged}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {m.stockBefore} → {m.stockAfter}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{m.reason}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground/70">
                              <span>{formatDateTime(m.createdAt)}</span>
                              <span>·</span>
                              <span>{m.createdBy?.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {movMeta.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">Page {movMeta.page} of {movMeta.totalPages}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setMovPage(p => Math.max(1, p - 1))}
                            disabled={movMeta.page <= 1}
                            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            onClick={() => setMovPage(p => Math.min(movMeta.totalPages, p + 1))}
                            disabled={movMeta.page >= movMeta.totalPages}
                            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Created {formatDateTime(product.createdAt)}</span>
                  <span>Updated {formatDateTime(product.updatedAt)}</span>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {product && (
        <>
          <ProductFormModal open={editOpen} onClose={() => setEditOpen(false)} existing={product} />
          <StockAdjustModal product={product} open={adjustOpen} onClose={() => setAdjustOpen(false)} />
        </>
      )}
    </>
  );
};

const InfoRow: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
      <Icon size={13} className="text-muted-foreground" />
    </div>
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground font-medium">{value}</p>
    </div>
  </div>
);
