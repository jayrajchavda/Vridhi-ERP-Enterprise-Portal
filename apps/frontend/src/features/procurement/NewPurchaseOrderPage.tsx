import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, PlusCircle } from 'lucide-react';
import { procurementApi } from './procurement.api';
import { productsApi } from '../products/products.api';
import { toast } from 'sonner';

interface POItemInput {
  productId: string;
  quantityOrdered: number;
  unitCost: string;
}

export const NewPurchaseOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState<POItemInput[]>([{ productId: '', quantityOrdered: 10, unitCost: '0' }]);

  // Fetch Vendors
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => procurementApi.listVendors({ limit: 100 }),
  });
  const vendors = vendorsData?.data ?? [];

  // Fetch Products
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list({ limit: 200 }),
  });
  const products = productsData?.data ?? [];

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantityOrdered: 10, unitCost: '0' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return toast.error('PO must contain at least one item');
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof POItemInput, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      updated[index].productId = value;
      // Pre-fill unit cost with product unitPrice (cost estimation)
      const selectedProd = products.find((p: any) => p.id === value);
      if (selectedProd) {
        updated[index].unitCost = String(selectedProd.unitPrice);
      }
    } else if (field === 'quantityOrdered') {
      updated[index].quantityOrdered = Math.max(1, parseInt(value, 10) || 0);
    } else if (field === 'unitCost') {
      updated[index].unitCost = value;
    }
    setItems(updated);
  };

  const grandTotal = items.reduce((acc, curr) => {
    const cost = parseFloat(curr.unitCost) || 0;
    return acc + curr.quantityOrdered * cost;
  }, 0);

  const createMutation = useMutation({
    mutationFn: (body: any) => procurementApi.createPurchaseOrder(body),
    onSuccess: (res) => {
      toast.success(`Purchase Order ${res.data.poNumber} created in Draft state!`);
      navigate(`/procurement/purchase-orders/${res.data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create PO');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return toast.error('Please select a supplier / vendor');
    if (items.some((i) => !i.productId)) return toast.error('Please select a product for all lines');
    if (items.some((i) => i.quantityOrdered <= 0)) return toast.error('Quantities must be greater than zero');

    createMutation.mutate({
      vendorId,
      items: items.map((i) => ({
        productId: i.productId,
        quantityOrdered: i.quantityOrdered,
        unitCost: parseFloat(i.unitCost).toFixed(2),
      })),
    });
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/procurement/purchase-orders')}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to PO List
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">Create Purchase Order</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Request inventory items and dispatch orders to registered suppliers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor Selection Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-2 uppercase tracking-wider text-muted-foreground">
            Supplier Details
          </h2>
          <div className="max-w-md space-y-1.5">
            <label className="text-xs font-medium text-foreground">Select Vendor / Supplier *</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
              required
            >
              <option value="">-- Choose Vendor --</option>
              {vendors.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.contactPerson ? `(${v.contactPerson})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PO Items Builder Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
              Order Line Items
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
            >
              <PlusCircle size={14} /> Add Line Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-3 flex-wrap md:flex-nowrap border-b border-border/40 pb-3 md:border-0 md:pb-0">
                {/* Product Dropdown */}
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  {idx === 0 && <label className="text-xs font-medium text-foreground">Product *</label>}
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                    required
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.sku}] (Stock: {p.currentStock})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty Ordered */}
                <div className="w-24 md:w-32 space-y-1.5">
                  {idx === 0 && <label className="text-xs font-medium text-foreground">Qty Ordered *</label>}
                  <input
                    type="number"
                    value={item.quantityOrdered}
                    onChange={(e) => handleItemChange(idx, 'quantityOrdered', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                    required
                    min={1}
                  />
                </div>

                {/* Unit Cost */}
                <div className="w-28 md:w-36 space-y-1.5">
                  {idx === 0 && <label className="text-xs font-medium text-foreground">Unit Cost (INR) *</label>}
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitCost}
                    onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                    required
                    min={0}
                  />
                </div>

                {/* Line Total display */}
                <div className="w-28 md:w-36 text-right pb-2 font-mono font-semibold text-foreground text-sm">
                  {idx === 0 && <div className="text-xs font-medium text-muted-foreground mb-3 text-right">Line Total</div>}
                  {((parseFloat(item.unitCost) || 0) * item.quantityOrdered).toFixed(2)}
                </div>

                {/* Delete line */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors mb-0.5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Grand Total banner */}
          <div className="flex items-center justify-end pt-4 border-t border-border mt-5">
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-semibold">Estimated PO Valuation:</span>
              <div className="text-xl font-bold text-foreground font-mono">
                INR {grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/procurement/purchase-orders')}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving...' : 'Create Draft PO'}
          </button>
        </div>
      </form>
    </div>
  );
};
