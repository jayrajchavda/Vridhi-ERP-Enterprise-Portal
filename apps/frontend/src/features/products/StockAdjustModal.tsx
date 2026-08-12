import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { productsApi, Product } from './products.api';
import { cn, formatCurrency } from '../../lib/utils';

const schema = z.object({
  movementType:    z.enum(['IN', 'OUT']),
  quantityChanged: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  reason:          z.string().min(3, 'Reason is required (min 3 characters)').trim(),
});
type FormData = z.infer<typeof schema>;

interface StockAdjustModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

const inputCls = (err?: boolean) => cn(
  'w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground',
  'outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
  err ? 'border-destructive' : 'border-border hover:border-brand-400'
);

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({ product, open, onClose }) => {
  const qc = useQueryClient();

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { movementType: 'IN', quantityChanged: 1, reason: '' },
  });

  const movementType = watch('movementType');
  const qty          = watch('quantityChanged') || 0;
  const projectedStock = movementType === 'IN'
    ? product.currentStock + Number(qty)
    : product.currentStock - Number(qty);
  const willGoBelowMin = projectedStock < product.minStockAlert;
  const willGoNegative = projectedStock < 0;

  const mutation = useMutation({
    mutationFn: (data: FormData) => productsApi.applyMovement(product.id, data),
    onSuccess: () => {
      toast.success('Stock updated', {
        description: `${movementType === 'IN' ? '+' : '-'}${qty} units applied to ${product.name}`
      });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', product.id] });
      qc.invalidateQueries({ queryKey: ['low-stock-count'] });
      qc.invalidateQueries({ queryKey: ['product-movements', product.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      handleClose();
    },
  });

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (err: any) {
      if (err.code === 'INSUFFICIENT_STOCK') {
        toast.error('Insufficient Stock', {
          description: `Only ${product.currentStock} units available.`
        });
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Adjust Stock</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium">{product.name}</span>
              <span className="mx-1.5">·</span>
              <span className="font-mono text-xs">{product.sku}</span>
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Current stock snapshot */}
        <div className="mx-6 mt-5 p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Stock</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{product.currentStock}</p>
            <p className="text-xs text-muted-foreground">Min alert: {product.minStockAlert}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Unit Price</p>
            <p className="text-base font-semibold text-foreground mt-0.5">{formatCurrency(product.unitPrice)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Movement type toggle */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Movement Type <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'IN',  label: 'Stock In',  icon: ArrowUpCircle,   cls: 'border-success/50 bg-success/10 text-success' },
                { value: 'OUT', label: 'Stock Out', icon: ArrowDownCircle, cls: 'border-danger/50 bg-danger/10 text-danger' },
              ].map(({ value, label, icon: Icon, cls }) => (
                <label
                  key={value}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all',
                    movementType === value ? cls : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  <input type="radio" value={value} {...register('movementType')} className="sr-only" />
                  <Icon size={18} className={movementType === value ? '' : 'text-muted-foreground'} />
                  <span className={cn('text-sm font-medium', movementType !== value && 'text-muted-foreground')}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Quantity <span className="text-destructive">*</span>
            </label>
            <input
              id="stock-qty"
              type="number"
              min={1}
              {...register('quantityChanged')}
              className={inputCls(!!errors.quantityChanged)}
            />
            {errors.quantityChanged && <p className="text-xs text-destructive mt-1">{errors.quantityChanged.message}</p>}
          </div>

          {/* Projected stock preview */}
          {Number(qty) > 0 && (
            <div className={cn(
              'flex items-center justify-between p-3 rounded-xl border text-sm',
              willGoNegative
                ? 'bg-danger/10 border-danger/30 text-danger'
                : willGoBelowMin
                  ? 'bg-warning/10 border-warning/30 text-warning'
                  : 'bg-success/10 border-success/30 text-success'
            )}>
              <span className="text-xs font-medium">Projected stock after:</span>
              <span className="font-bold">{projectedStock < 0 ? '⚠ ' : ''}{projectedStock} units</span>
            </div>
          )}

          {/* Negative stock warning */}
          {willGoNegative && Number(qty) > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger">
              <AlertTriangle size={14} className="shrink-0" />
              Stock cannot go below zero. Available: {product.currentStock} units.
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Reason <span className="text-destructive">*</span>
            </label>
            <input
              id="stock-reason"
              {...register('reason')}
              placeholder="e.g. Purchase order received, Damaged goods removed..."
              className={inputCls(!!errors.reason)}
            />
            {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason.message}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              id="stock-adjust-submit"
              type="submit"
              disabled={isSubmitting || willGoNegative}
              className={cn(
                'flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-60',
                movementType === 'IN' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
              )}
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {movementType === 'IN' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
