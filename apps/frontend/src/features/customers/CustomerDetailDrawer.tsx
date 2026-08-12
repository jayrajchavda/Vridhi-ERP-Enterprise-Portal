import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Phone, Mail, Building2, Receipt, CalendarClock, Edit2, FileText, ArrowRight
} from 'lucide-react';
import { customersApi, Customer } from './customers.api';
import { CustomerNotesPanel } from './CustomerNotesPanel';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerInteractionsPanel } from './CustomerInteractionsPanel';
import { StatusBadge, TypeBadge } from '../../components/Badges';
import { formatDate, formatDateTime, isOverdue, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

interface CustomerDetailDrawerProps {
  customerId: string | null;
  onClose: () => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({ customerId, onClose }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data: customer, isLoading } = useQuery<Customer & { challans?: any[] }>({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.get(customerId!),
    enabled: Boolean(customerId),
    staleTime: 15_000,
  });

  if (!customerId) return null;

  const overdue = isOverdue(customer?.followUpDate);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className={cn(
        'fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-card border-l border-border',
        'shadow-2xl flex flex-col transition-transform duration-300',
        customerId ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          {isLoading ? (
            <div className="space-y-2 flex-1">
              <div className="h-5 w-36 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          ) : customer ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground truncate">{customer.name}</h2>
                <StatusBadge status={customer.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <TypeBadge type={customer.customerType} />
                {customer.businessName && (
                  <span className="text-xs text-muted-foreground truncate">{customer.businessName}</span>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 ml-3">
            {canEdit && customer && (
              <button
                id="customer-edit-btn"
                onClick={() => setEditOpen(true)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Edit customer"
              >
                <Edit2 size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          )}

          {customer && (
            <div className="p-6 space-y-6">
              {/* Contact info */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</h3>
                <div className="space-y-2">
                  <InfoRow icon={Phone} label="Mobile" value={customer.mobile} />
                  {customer.email && <InfoRow icon={Mail} label="Email" value={customer.email} />}
                  {customer.businessName && <InfoRow icon={Building2} label="Business" value={customer.businessName} />}
                  {customer.gstNumber && <InfoRow icon={Receipt} label="GST" value={customer.gstNumber} mono />}
                </div>
              </section>

              {/* Follow-up */}
              {customer.followUpDate && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Follow-up</h3>
                  <div className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border text-sm',
                    overdue
                      ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                      : 'bg-muted/50 border-border text-foreground'
                  )}>
                    <CalendarClock size={15} className={overdue ? 'text-red-500' : 'text-muted-foreground'} />
                    <span className={cn('font-medium', overdue && 'font-semibold')}>
                      {overdue && 'OVERDUE — '}
                      {formatDate(customer.followUpDate)}
                    </span>
                  </div>
                </section>
              )}

              {/* Challan history */}
              {Array.isArray((customer as any).challans) && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Challans ({(customer as any).challans?.length ?? 0})
                    </h3>
                    <button
                      onClick={() => navigate(`/challans?customerId=${customer.id}`)}
                      className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1"
                    >
                      View all <ArrowRight size={11} />
                    </button>
                  </div>
                  {(customer as any).challans?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No challans yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {((customer as any).challans as any[]).slice(0, 5).map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border/60">
                          <div className="flex items-center gap-2">
                            <FileText size={13} className="text-muted-foreground" />
                            <span className="text-xs font-medium text-foreground">{c.challanNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Notes */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Follow-up Notes</h3>
                <CustomerNotesPanel customerId={customer.id} />
              </section>

              {/* Interactions */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Interaction History</h3>
                <CustomerInteractionsPanel customerId={customer.id} />
              </section>

              {/* Meta */}
              <section className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Created {formatDateTime(customer.createdAt)}</span>
                  <span>Updated {formatDateTime(customer.updatedAt)}</span>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {customer && (
        <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} existing={customer} />
      )}
    </>
  );
};

const InfoRow: React.FC<{ icon: React.ElementType; label: string; value: string; mono?: boolean }> = ({
  icon: Icon, label, value, mono
}) => (
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
      <Icon size={13} className="text-muted-foreground" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-sm text-foreground truncate', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  </div>
);
