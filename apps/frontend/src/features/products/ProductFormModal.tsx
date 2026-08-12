import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Package } from 'lucide-react';
import { productsApi, Product } from './products.api';
import { cn } from '../../lib/utils';

const schema = z.object({
  name:          z.string().min(2, 'Name is required').trim(),
  sku:           z.string().min(1, 'SKU is required').trim().toUpperCase(),
  category:      z.string().min(1, 'Category is required').trim(),
  unitPrice:     z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 99.99)'),
  currentStock:  z.coerce.number().int().min(0, 'Stock cannot be negative'),
  minStockAlert: z.coerce.number().int().min(0, 'Min stock alert cannot be negative'),
  location:      z.string().trim().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  existing?: Product;
}

const inputCls = (err?: boolean) => cn(
  'w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground',
  'outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
  err ? 'border-destructive' : 'border-border hover:border-brand-400'
);

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode; required?: boolean; hint?: string; className?: string }> = ({
  label, error, children, required, hint
}) => (
  <div>
    <label className="block text-xs font-medium text-foreground mb-1.5">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
      {hint && <span className="text-muted-foreground font-normal ml-1">({hint})</span>}
    </label>
    {children}
    {error && <p className="text-xs text-destructive mt-1">{error}</p>}
  </div>
);

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, onClose, existing }) => {
  const qc = useQueryClient();
  const isEdit = Boolean(existing);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          existing?.name ?? '',
      sku:           existing?.sku ?? '',
      category:      existing?.category ?? '',
      unitPrice:     existing?.unitPrice ?? '',
      currentStock:  existing?.currentStock ?? 0,
      minStockAlert: existing?.minStockAlert ?? 5,
      location:      existing?.location ?? '',
    },
  });

  const onSuccess = (label: string) => {
    toast.success(label);
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['low-stock-count'] });
    if (existing) qc.invalidateQueries({ queryKey: ['product', existing.id] });
    handleClose();
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      productsApi.create({ ...data, unitPrice: data.unitPrice, location: data.location || undefined }),
    onSuccess: () => onSuccess('Product created'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      productsApi.update(existing!.id, { ...data, location: data.location || undefined }),
    onSuccess: () => onSuccess('Product updated'),
  });

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) await updateMutation.mutateAsync(data);
      else await createMutation.mutateAsync(data);
    } catch (err: any) {
      if (err.code === 'DUPLICATE_SKU') {
        toast.error('Duplicate SKU', { description: 'A product with this SKU already exists.' });
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Package size={15} className="text-brand-600 dark:text-brand-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit ? 'Update product details' : 'Add to your product catalogue'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Name" error={errors.name?.message} required className="col-span-2">
                <input id="product-name" {...register('name')} placeholder="e.g. Industrial Bearing 6205" className={inputCls(!!errors.name)} />
              </Field>

              <Field label="SKU" error={errors.sku?.message} required hint="auto-uppercase">
                <input id="product-sku" {...register('sku')} placeholder="e.g. BRG-6205" className={cn(inputCls(!!errors.sku), 'font-mono')} style={{ textTransform: 'uppercase' }} />
              </Field>

              <Field label="Category" error={errors.category?.message} required>
                <input id="product-category" {...register('category')} placeholder="e.g. Bearings" className={inputCls(!!errors.category)} />
              </Field>

              <Field label="Unit Price (₹)" error={errors.unitPrice?.message} required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input id="product-price" {...register('unitPrice')} placeholder="0.00" className={cn(inputCls(!!errors.unitPrice), 'pl-7')} />
                </div>
              </Field>

              <Field label="Storage Location" error={errors.location?.message}>
                <input id="product-location" {...register('location')} placeholder="e.g. Rack A-3" className={inputCls(!!errors.location)} />
              </Field>

              <Field label="Current Stock" error={errors.currentStock?.message} required hint={isEdit ? 'use adjust stock' : undefined}>
                <input
                  id="product-stock"
                  type="number" min={0}
                  {...register('currentStock')}
                  disabled={isEdit}
                  className={cn(inputCls(!!errors.currentStock), isEdit && 'opacity-50 cursor-not-allowed bg-muted')}
                />
              </Field>

              <Field label="Min Stock Alert" error={errors.minStockAlert?.message} required hint="threshold for warnings">
                <input id="product-min-stock" type="number" min={0} {...register('minStockAlert')} className={inputCls(!!errors.minStockAlert)} />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30 shrink-0 rounded-b-2xl">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              id="product-form-submit"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60"
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

declare module 'react' {
  interface HTMLAttributes<T> { className?: string; }
}
