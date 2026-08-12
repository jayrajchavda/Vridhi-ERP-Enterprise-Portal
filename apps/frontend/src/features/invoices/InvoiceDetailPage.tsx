import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CreditCard, History, AlertTriangle } from 'lucide-react';
import { invoicesApi, InvoicePayment } from './invoices.api';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const { data: invoiceRes, isLoading, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getInvoice(id!),
    enabled: Boolean(id),
  });

  const { data: paymentsRes } = useQuery({
    queryKey: ['invoice-payments', id],
    queryFn: () => invoicesApi.getPayments(id!),
    enabled: Boolean(id),
  });

  const invoice = invoiceRes?.data;
  const payments: InvoicePayment[] = paymentsRes?.data ?? [];

  const paymentMutation = useMutation({
    mutationFn: (body: any) => invoicesApi.recordPayment(id!, body),
    onSuccess: () => {
      toast.success('Payment transaction logged successfully!');
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      setPaymentOpen(false);
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoice-payments', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to record payment');
    },
  });

  if (isLoading) return <LoadingSkeletonTable />;
  if (isError || !invoice) return <ErrorBanner message="Invoice not found" />;

  // Calculate totals
  const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const remaining = Number(invoice.totalAmount) - totalPaid;

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return toast.error('Please enter a valid payment amount');
    }
    if (parsedAmount > remaining) {
      return toast.error(`Payment amount exceeds remaining balance of ${formatCurrency(remaining)}`);
    }

    paymentMutation.mutate({
      amount: parsedAmount.toFixed(2),
      paymentMode: payMode,
      referenceNumber: payRef.trim() || undefined,
      notes: payNotes.trim() || undefined,
    });
  };

  const isStateMissing = !invoice.customer.state;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/invoices')}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Invoices
      </button>

      {/* Warning Banner for State Missing */}
      {isStateMissing && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-600 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">⚠ State Code Missing:</span> The state is missing on this customer's profile.
            Intra-state CGST & SGST split rates were dynamically applied as a fallback. Please update the customer profile address state.
          </div>
        </div>
      )}

      {/* Main Details Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-card border border-border p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground font-mono">{invoice.invoiceNumber}</h1>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase border ${
              invoice.status === 'PAID'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : invoice.status === 'PARTIALLY_PAID'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            }`}>
              {invoice.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Sales Challan Reference: <span className="font-mono font-semibold text-foreground">{invoice.challan.challanNumber}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PDF URL */}
          <a
            href={invoicesApi.downloadInvoicePdfUrl(invoice.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
          >
            <Download size={14} />
            Download Invoice PDF
          </a>

          {invoice.status !== 'PAID' && (
            <button
              onClick={() => setPaymentOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm"
            >
              <CreditCard size={14} />
              Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer and Line Items Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Billed Info */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Billed Customer</h3>
              <p className="font-semibold text-foreground">{invoice.customer.name}</p>
              {invoice.customer.businessName && <p className="text-sm text-muted-foreground">{invoice.customer.businessName}</p>}
              <p className="text-xs text-muted-foreground mt-1">Ph: {invoice.customer.mobile}</p>
              {invoice.customer.email && <p className="text-xs text-muted-foreground">Email: {invoice.customer.email}</p>}
            </div>
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tax Registration</h3>
              <p className="text-sm text-foreground">
                Billing State: <span className="font-semibold">{invoice.customer.state || 'Fallback state (Maharashtra)'}</span>
              </p>
              {invoice.customer.gstNumber ? (
                <p className="text-sm text-foreground">
                  GSTIN ID: <span className="font-mono font-semibold text-brand-500">{invoice.customer.gstNumber}</span>
                </p>
              ) : (
                <p className="text-xs text-amber-600 font-medium mt-1">⚠ Unregistered Customer (No GSTIN provided)</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">Invoice Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/10 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="p-3">Item details</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoice.challan.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <div className="font-semibold">{item.productNameSnapshot}</div>
                        <div className="text-xs font-mono text-muted-foreground">{item.skuSnapshot}</div>
                      </td>
                      <td className="p-3 text-right font-semibold">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(Number(item.unitPriceSnapshot))}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(Number(item.lineTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-border pt-4 flex flex-col items-end space-y-2 text-sm">
              <div className="flex justify-between w-64 text-muted-foreground">
                <span>Taxable Subtotal:</span>
                <span className="font-mono text-foreground">{formatCurrency(Number(invoice.subtotal))}</span>
              </div>

              {Number(invoice.cgstAmount) > 0 && (
                <>
                  <div className="flex justify-between w-64 text-muted-foreground">
                    <span>CGST:</span>
                    <span className="font-mono text-foreground">{formatCurrency(Number(invoice.cgstAmount))}</span>
                  </div>
                  <div className="flex justify-between w-64 text-muted-foreground">
                    <span>SGST:</span>
                    <span className="font-mono text-foreground">{formatCurrency(Number(invoice.sgstAmount))}</span>
                  </div>
                </>
              )}

              {Number(invoice.igstAmount) > 0 && (
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>IGST:</span>
                  <span className="font-mono text-foreground">{formatCurrency(Number(invoice.igstAmount))}</span>
                </div>
              )}

              <div className="border-t border-border pt-2 flex justify-between w-64 font-bold text-base text-foreground">
                <span>Grand Total:</span>
                <span className="font-mono text-brand-500">{formatCurrency(Number(invoice.totalAmount))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History & Side Info */}
        <div className="space-y-6">
          {/* Summary Balance Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Invoicing Ledger</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="border border-border p-3 rounded-lg">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase">Total Paid</div>
                <div className="font-mono font-bold text-emerald-500 text-sm mt-0.5">
                  {formatCurrency(totalPaid)}
                </div>
              </div>
              <div className="border border-border p-3 rounded-lg">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase">Remaining</div>
                <div className="font-mono font-bold text-rose-500 text-sm mt-0.5">
                  {formatCurrency(remaining)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Log */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 border-b border-border pb-2">
              <History size={15} className="text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Payment Transactions</h3>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">No payments logged yet for this invoice.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {payments.map((pmt) => (
                  <div key={pmt.id} className="border border-border/60 bg-muted/20 p-3 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-emerald-500 font-mono">{formatCurrency(Number(pmt.amount))}</span>
                      <span className="bg-background px-2 py-0.5 rounded border border-border text-[9px] uppercase">{pmt.paymentMode}</span>
                    </div>
                    {pmt.referenceNumber && (
                      <div className="text-muted-foreground">Ref: <span className="font-mono font-semibold text-foreground">{pmt.referenceNumber}</span></div>
                    )}
                    {pmt.notes && <div className="text-muted-foreground italic">"{pmt.notes}"</div>}
                    <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-1 flex justify-between">
                      <span>By {pmt.createdBy.name}</span>
                      <span>{new Date(pmt.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Form Modal */}
      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Record Payment</h2>
              <button onClick={() => setPaymentOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-brand-500/10 border border-brand-500/20 p-3 rounded-lg text-xs flex justify-between text-brand-500">
                <span>Unpaid Balance:</span>
                <span className="font-mono font-bold">{formatCurrency(remaining)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Amount Received (INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={remaining}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`Max ${remaining.toFixed(2)}`}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Payment Mode *</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                  required
                >
                  <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT/RTGS)</option>
                  <option value="UPI">UPI (GPay/PhonePe/BHIM)</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="CHEQUE">Cheque Payment</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Ref / Tx Number</label>
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Tx ID, Cheque number, etc."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Notes / Comments</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Additional receipt logs, clearance dates, etc."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-5">
                <button
                  type="button"
                  onClick={() => setPaymentOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm"
                >
                  {paymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal minimal Close SVG icon helper since X wasn't imported from lucide-react directly
const X: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
