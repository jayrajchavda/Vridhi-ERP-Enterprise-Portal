import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X, Printer, CheckCircle2, XCircle, FileText,
  Phone, Mail, Calendar, ShieldAlert, ExternalLink
} from 'lucide-react';
import { challansApi, SalesChallan } from './challans.api';
import { invoicesApi } from '../invoices/invoices.api';
import { StatusBadge } from '../../components/Badges';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useCanAccess } from '../../components/ProtectedRoute';

interface ChallanDetailModalProps {
  challanId: string | null;
  onClose: () => void;
}

export const ChallanDetailModal: React.FC<ChallanDetailModalProps> = ({ challanId, onClose }) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canManage = useCanAccess(['ADMIN', 'SALES']);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const convertMutation = useMutation({
    mutationFn: () => invoicesApi.convertChallan(challanId!),
    onSuccess: (res) => {
      toast.success('Tax Invoice successfully generated from this challan!');
      onClose();
      navigate(`/invoices/${res.data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Conversion failed');
    },
  });

  const { data: challan, isLoading } = useQuery<SalesChallan>({
    queryKey: ['challan', challanId],
    queryFn: () => challansApi.get(challanId!),
    enabled: Boolean(challanId),
  });

  const confirmMutation = useMutation({
    mutationFn: () => challansApi.confirm(challanId!),
    onSuccess: (updated) => {
      toast.success(`Challan ${updated.challanNumber} Confirmed`, {
        description: 'Stock deducted automatically for all items.',
      });
      qc.invalidateQueries({ queryKey: ['challans'] });
      qc.invalidateQueries({ queryKey: ['challan', challanId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => challansApi.cancel(challanId!),
    onSuccess: (updated) => {
      toast.success(`Challan ${updated.challanNumber} Cancelled`, {
        description: 'Stock restored for all confirmed line items.',
      });
      setConfirmCancelOpen(false);
      qc.invalidateQueries({ queryKey: ['challans'] });
      qc.invalidateQueries({ queryKey: ['challan', challanId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (!challanId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm print:hidden" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:inset-auto">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:max-h-none print:w-full">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <FileText size={16} className="text-brand-600 dark:text-brand-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    {challan?.challanNumber || 'Loading...'}
                  </h2>
                  {challan && <StatusBadge status={challan.status} />}
                </div>
                <p className="text-xs text-muted-foreground">Sales Delivery Challan</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="print-challan-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Printer size={14} /> Print
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal / Printable Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6 print:p-8">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
                <div className="h-24 bg-muted animate-pulse rounded-lg" />
                <div className="h-40 bg-muted animate-pulse rounded-lg" />
              </div>
            ) : challan ? (
              <>
                {/* Invoice / Challan Header Info */}
                <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-border">
                  <div>
                    <div className="text-lg font-black tracking-tight text-foreground">MINI ERP OPERATIONS</div>
                    <div className="text-xs text-muted-foreground mt-0.5">123 Business Park, Phase 1</div>
                    <div className="text-xs text-muted-foreground">GSTIN: 27AAAAA0000A1Z5</div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-sm font-bold text-foreground">CHALLAN #{challan.challanNumber}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center sm:justify-end gap-1">
                      <Calendar size={13} /> {formatDate(challan.createdAt)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Created by: {challan.createdBy?.name || 'System'}
                    </div>
                  </div>
                </div>

                {/* Customer Details Box */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Billed & Shipped To</p>
                    <p className="text-sm font-bold text-foreground">{challan.customer?.name}</p>
                    {challan.customer?.businessName && (
                      <p className="text-xs text-muted-foreground">{challan.customer.businessName}</p>
                    )}
                    {challan.customer?.gstNumber && (
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">GST: {challan.customer.gstNumber}</p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone size={13} /> {challan.customer?.mobile}
                    </div>
                    {challan.customer?.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={13} /> {challan.customer.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        <th className="py-2 text-left">#</th>
                        <th className="py-2 text-left">Item Description</th>
                        <th className="py-2 text-center">SKU</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {challan.items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="py-3 font-medium text-foreground">
                            {item.productNameSnapshot || item.product?.name}
                          </td>
                          <td className="py-3 text-center font-mono text-xs text-muted-foreground">
                            {item.skuSnapshot || item.product?.sku}
                          </td>
                          <td className="py-3 text-center font-bold text-foreground">{item.quantity}</td>
                          <td className="py-3 text-right text-muted-foreground">
                            {formatCurrency(item.unitPriceSnapshot || item.product?.unitPrice || 0)}
                          </td>
                          <td className="py-3 text-right font-semibold text-foreground">
                            {formatCurrency(item.lineTotal || (parseFloat(item.product?.unitPrice || '0') * item.quantity))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand Total Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-border gap-4">
                  <div className="text-xs text-muted-foreground">
                    Total Line Items: <span className="font-semibold text-foreground">{challan.items.length}</span>
                    <span className="mx-2">·</span>
                    Total Units: <span className="font-semibold text-foreground">{challan.totalQuantity}</span>
                  </div>

                  <div className="text-right w-full sm:w-auto p-4 rounded-xl bg-brand-50/50 dark:bg-brand-900/10 border border-brand-200/50">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount: </span>
                    <span className="text-xl font-bold text-brand-600 dark:text-brand-400 ml-2">
                      {formatCurrency(challan.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Terms / Signatures for print */}
                <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Terms & Conditions:</p>
                    <p>1. Goods once sold will not be taken back.</p>
                    <p>2. Subject to local jurisdiction.</p>
                  </div>
                  <div className="text-right pt-8 border-t border-gray-300">
                    Authorized Signatory
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Action Footer Bar */}
          {challan && canManage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0 print:hidden">
              <div className="text-xs text-muted-foreground">
                Status: <span className="font-semibold text-foreground">{challan.status}</span>
              </div>

              <div className="flex items-center gap-3">
                {challan.status === 'DRAFT' && (
                  <button
                    id="confirm-challan-action-btn"
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> Confirm & Deduct Stock
                  </button>
                )}

                {challan.status === 'CONFIRMED' && (
                  (challan as any).invoice ? (
                    <button
                      onClick={() => { onClose(); navigate(`/invoices/${(challan as any).invoice.id}`); }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-brand-200 text-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors"
                    >
                      <ExternalLink size={14} /> View Invoice ({(challan as any).invoice.invoiceNumber})
                    </button>
                  ) : (
                    <button
                      onClick={() => convertMutation.mutate()}
                      disabled={convertMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50"
                    >
                      <FileText size={14} /> Convert to Invoice
                    </button>
                  )
                )}

                {challan.status !== 'CANCELLED' && (
                  <button
                    id="cancel-challan-action-btn"
                    onClick={() => setConfirmCancelOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <XCircle size={14} /> Cancel Challan
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Cancel */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert size={24} />
              <h3 className="text-base font-bold text-foreground">Cancel Sales Challan?</h3>
            </div>

            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel <span className="font-semibold text-foreground">Challan #{challan?.challanNumber}</span>?
              {challan?.status === 'CONFIRMED' && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  ⚠ Stock will be automatically reversed and added back to inventory.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmCancelOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted"
              >
                Keep Active
              </button>
              <button
                id="confirm-cancel-dialog-btn"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                Yes, Cancel Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
