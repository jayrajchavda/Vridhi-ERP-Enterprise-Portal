import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Plus, Trash2, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { challansApi, SalesChallan, CreateChallanInput } from './challans.api';
import { customersApi, Customer } from '../customers/customers.api';
import { productsApi, Product } from '../products/products.api';
import { formatCurrency, cn } from '../../lib/utils';

interface ChallanFormModalProps {
  open: boolean;
  onClose: () => void;
  existing?: SalesChallan;
}

interface FormItem {
  productId: string;
  quantity: number;
}

export const ChallanFormModal: React.FC<ChallanFormModalProps> = ({ open, onClose, existing }) => {
  const qc = useQueryClient();
  const isEdit = Boolean(existing);

  const [customerId, setCustomerId] = useState(existing?.customerId ?? '');
  const [items, setItems]           = useState<FormItem[]>(
    existing?.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) ?? [
      { productId: '', quantity: 1 },
    ]
  );
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');

  // Load customers for dropdown
  const { data: customerData } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: () => customersApi.list({ limit: 100 }),
    enabled: open,
  });
  const customers: Customer[] = customerData?.data ?? [];

  // Load products for dropdown and price/stock lookup
  const { data: productData } = useQuery({
    queryKey: ['products-dropdown'],
    queryFn: () => productsApi.list({ limit: 100 }),
    enabled: open,
  });
  const products: Product[] = productData?.data ?? [];
  const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

  useEffect(() => {
    if (existing) {
      setCustomerId(existing.customerId);
      setItems(existing.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    } else {
      setCustomerId('');
      setItems([{ productId: '', quantity: 1 }]);
    }
  }, [existing, open]);

  // Dynamic Item Helpers
  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof FormItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Calculations & Stock Checks
  let grandTotal = 0;
  let totalQty = 0;
  let stockIssues: string[] = [];

  items.forEach((item) => {
    if (item.productId) {
      const prod = productMap.get(item.productId);
      if (prod) {
        const qty = Number(item.quantity) || 0;
        const price = parseFloat(prod.unitPrice) || 0;
        grandTotal += price * qty;
        totalQty += qty;

        if (submitStatus === 'CONFIRMED' && qty > prod.currentStock) {
          stockIssues.push(
            `"${prod.name}": requested ${qty}, available ${prod.currentStock}`
          );
        }
      }
    }
  });

  const handleClose = () => {
    setCustomerId('');
    setItems([{ productId: '', quantity: 1 }]);
    onClose();
  };

  const onSuccess = (created: SalesChallan) => {
    toast.success(
      isEdit
        ? `Challan ${created.challanNumber} updated`
        : `Challan ${created.challanNumber} created as ${created.status}`
    );
    qc.invalidateQueries({ queryKey: ['challans'] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    handleClose();
  };

  const mutation = useMutation({
    mutationFn: (data: CreateChallanInput) =>
      isEdit
        ? challansApi.update(existing!.id, data)
        : challansApi.create(data),
    onSuccess,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please select at least one valid product line item');
      return;
    }

    if (stockIssues.length > 0) {
      toast.error('Insufficient Stock Alert', {
        description: stockIssues.join('; '),
      });
      return;
    }

    const payload: CreateChallanInput = {
      customerId,
      status: submitStatus,
      items: validItems.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
    };

    try {
      await mutation.mutateAsync(payload);
    } catch (err: any) {
      if (err.code === 'INSUFFICIENT_STOCK') {
        const details = err.details
          ?.map((d: any) => `${d.productName}: req ${d.requestedQuantity}, avail ${d.availableStock}`)
          .join('; ');
        toast.error('Insufficient Stock', { description: details || err.message });
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <FileText size={16} className="text-brand-600 dark:text-brand-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? `Edit Challan ${existing?.challanNumber}` : 'Create Sales Challan'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit ? 'Update line items' : 'Select customer and add line items'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Customer <span className="text-destructive">*</span>
            </label>
            <select
              id="challan-customer-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Select a Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.businessName ? `(${c.businessName})` : ''} — {c.mobile}
                </option>
              ))}
            </select>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground">
                Line Items <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const prod = productMap.get(item.productId);
                const price = prod ? parseFloat(prod.unitPrice) : 0;
                const qty = Number(item.quantity) || 0;
                const lineTotal = price * qty;
                const isShort = prod && qty > prod.currentStock;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-colors',
                      isShort ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/30 border-border'
                    )}
                  >
                    {/* Product Select */}
                    <div className="flex-1 w-full">
                      <select
                        id={`challan-item-product-${idx}`}
                        value={item.productId}
                        onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground outline-none"
                      >
                        <option value="">Select Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — {formatCurrency(p.unitPrice)} (Stock: {p.currentStock})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-24 shrink-0">
                      <input
                        id={`challan-item-qty-${idx}`}
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground text-center font-medium"
                      />
                    </div>

                    {/* Line total & remove */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="text-right sm:min-w-[100px]">
                        <div className="text-xs font-semibold text-foreground">{formatCurrency(lineTotal)}</div>
                        {prod && (
                          <div className="text-[10px] text-muted-foreground">
                            Stock: {prod.currentStock}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock Warning Banner */}
          {stockIssues.length > 0 && submitStatus === 'CONFIRMED' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Stock Shortage Detected</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {stockIssues.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Line Items: {items.length}</p>
              <p className="text-xs text-muted-foreground">Total Units: {totalQty}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Grand Total</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(grandTotal)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>

            {!isEdit && (
              <button
                id="challan-save-draft-btn"
                type="submit"
                onClick={() => setSubmitStatus('DRAFT')}
                disabled={mutation.isPending}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
            )}

            <button
              id="challan-confirm-submit-btn"
              type="submit"
              onClick={() => setSubmitStatus('CONFIRMED')}
              disabled={mutation.isPending}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60"
            >
              {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <CheckCircle2 size={16} />
              {isEdit ? 'Save Changes' : 'Confirm & Deduct Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
