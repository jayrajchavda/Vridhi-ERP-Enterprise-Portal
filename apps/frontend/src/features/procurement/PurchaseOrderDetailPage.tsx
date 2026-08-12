import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, XCircle, Download, CheckSquare } from 'lucide-react';
import { procurementApi, PurchaseOrderItem } from './procurement.api';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

export const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [receiptChallanRef, setReceiptChallanRef] = useState('');
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  const { data: poRes, isLoading, isError } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => procurementApi.getPurchaseOrder(id!),
    enabled: Boolean(id),
  });

  const po = poRes?.data;

  const sendMutation = useMutation({
    mutationFn: () => procurementApi.sendPurchaseOrder(id!),
    onSuccess: () => {
      toast.success('PO status updated to SENT. Vendor email notification dispatched in the background!');
      qc.invalidateQueries({ queryKey: ['purchase-order', id] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send PO');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => procurementApi.cancelPurchaseOrder(id!),
    onSuccess: () => {
      toast.success('PO cancelled');
      qc.invalidateQueries({ queryKey: ['purchase-order', id] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel PO');
    },
  });

  const receiptMutation = useMutation({
    mutationFn: (body: any) => procurementApi.createPurchaseReceipt(body),
    onSuccess: () => {
      toast.success('Shipment receipt logged successfully and stock updated!');
      setReceiptChallanRef('');
      setReceivedQtys({});
      qc.invalidateQueries({ queryKey: ['purchase-order', id] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to log receipt');
    },
  });

  if (isLoading) return <LoadingSkeletonTable />;
  if (isError || !po) return <ErrorBanner message="Purchase Order not found" />;

  const handleQtyChange = (itemId: string, val: number, maxAllowed: number) => {
    setReceivedQtys({
      ...receivedQtys,
      [itemId]: Math.min(maxAllowed, Math.max(0, val)),
    });
  };

  const handleLogReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToLog = po.items
      .map((item: PurchaseOrderItem) => {
        const qty = receivedQtys[item.id] ?? 0;
        return { poItemId: item.id, quantityReceived: qty };
      })
      .filter((i: any) => i.quantityReceived > 0);

    if (itemsToLog.length === 0) {
      return toast.error('Please log received quantities (> 0) for at least one item');
    }

    receiptMutation.mutate({
      poId: po.id,
      deliveryChallanRef: receiptChallanRef.trim() || undefined,
      items: itemsToLog,
    });
  };

  const isPoFullyReceived = po.items.every(
    (item: PurchaseOrderItem) => item.quantityReceived >= item.quantityOrdered
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/procurement/purchase-orders')}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to PO List
      </button>

      {/* Title / Action bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground font-mono">{po.poNumber}</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-muted text-muted-foreground uppercase border border-border">
              {po.status}
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Supplier: <span className="font-semibold text-foreground">{po.vendor.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PDF button */}
          <a
            href={procurementApi.downloadPoPdfUrl(po.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
          >
            <Download size={14} />
            Download PDF
          </a>

          {/* DRAFT actions */}
          {po.status === 'DRAFT' && (
            <>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
              >
                <XCircle size={14} />
                Cancel PO
              </button>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm"
              >
                <Send size={14} />
                Send PO (Email)
              </button>
            </>
          )}

          {/* SENT actions */}
          {po.status === 'SENT' && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
            >
              <XCircle size={14} />
              Cancel PO
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PO Line Items Display */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
            Ordered Items Checklist
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/10 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="p-3">Product details</th>
                  <th className="p-3 text-right">Ordered</th>
                  <th className="p-3 text-right">Received</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {po.items.map((item: PurchaseOrderItem) => (
                  <tr key={item.id}>
                    <td className="p-3">
                      <div className="font-semibold">{item.productNameSnapshot}</div>
                      <div className="text-xs font-mono text-muted-foreground">{item.skuSnapshot}</div>
                    </td>
                    <td className="p-3 text-right font-semibold">{item.quantityOrdered}</td>
                    <td className="p-3 text-right">
                      <span className={item.quantityReceived >= item.quantityOrdered ? 'text-emerald-500 font-semibold' : 'text-amber-500'}>
                        {item.quantityReceived}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{formatCurrency(Number(item.unitCost))}</td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(item.quantityOrdered * Number(item.unitCost))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end text-right pt-2">
            <div>
              <span className="text-xs text-muted-foreground font-semibold">Total PO Amount:</span>
              <div className="text-lg font-bold text-foreground font-mono">
                {formatCurrency(Number(po.totalAmount))}
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Logging Section */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
            Log Receipt Shipment
          </h3>

          {po.status === 'DRAFT' || po.status === 'CANCELLED' ? (
            <p className="text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-lg border border-border">
              Shipment receipt logs can only be registered for orders in the **SENT** status.
            </p>
          ) : isPoFullyReceived ? (
            <div className="text-xs text-emerald-600 bg-emerald-500/10 p-3.5 rounded-lg border border-emerald-500/20 font-semibold">
              ✓ All ordered quantities have been successfully received. Order complete.
            </div>
          ) : (
            <form onSubmit={handleLogReceipt} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Supplier Challan / Invoice Ref</label>
                <input
                  value={receiptChallanRef}
                  onChange={(e) => setReceiptChallanRef(e.target.value)}
                  placeholder="e.g. CHN-99823"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantities Received:</label>
                {po.items.map((item: PurchaseOrderItem) => {
                  const maxAllowed = item.quantityOrdered - item.quantityReceived;
                  if (maxAllowed <= 0) return null;

                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-xs border-b border-border/40 pb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{item.productNameSnapshot}</div>
                        <div className="text-[10px] text-muted-foreground">Remaining: {maxAllowed}</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={maxAllowed}
                        value={receivedQtys[item.id] ?? 0}
                        onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value, 10) || 0, maxAllowed)}
                        className="w-20 px-2 py-1 rounded border border-border bg-background text-foreground text-center"
                      />
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={receiptMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
              >
                <CheckSquare size={14} />
                {receiptMutation.isPending ? 'Logging Shipment...' : 'Log Received Items'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
