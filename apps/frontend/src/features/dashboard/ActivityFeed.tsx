import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpCircle, ArrowDownCircle, FileText, Clock } from 'lucide-react';
import { cn, formatDateTime } from '../../lib/utils';

interface ActivityItem {
  id: string;
  type: 'stockMovement' | 'challan';
  label: string;
  sublabel: string;
  meta: string;
  timestamp: string;
  positive?: boolean;
  to?: string;
}

interface ActivityFeedProps {
  stockMovements: any[];
  challans: any[];
}

const CHALLAN_STATUS_CLASSES: Record<string, string> = {
  DRAFT:     'status-badge-draft',
  CONFIRMED: 'status-badge-confirmed',
  CANCELLED: 'status-badge-cancelled',
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ stockMovements, challans }) => {
  const navigate = useNavigate();

  // Merge and time-sort
  const items: ActivityItem[] = [
    ...stockMovements.slice(0, 5).map((m: any) => ({
      id: m.id,
      type: 'stockMovement' as const,
      label: `${m.movementType === 'IN' ? 'Stock In' : 'Stock Out'} — ${m.product?.name ?? 'Product'}`,
      sublabel: `SKU: ${m.product?.sku ?? '—'}  ·  Qty: ${m.movementType === 'IN' ? '+' : '-'}${m.quantityChanged}`,
      meta: m.reason ?? 'Manual adjustment',
      timestamp: m.createdAt,
      positive: m.movementType === 'IN',
      to: '/products',
    })),
    ...challans.slice(0, 5).map((c: any) => ({
      id: c.id,
      type: 'challan' as const,
      label: `Challan ${c.challanNumber}`,
      sublabel: c.customer?.name ?? 'Customer',
      meta: c.status,
      timestamp: c.createdAt,
      to: `/challans`,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, 10);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Clock size={28} className="text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div
          key={`${item.type}-${item.id}`}
          onClick={() => item.to && navigate(item.to)}
          className={cn(
            'flex items-start gap-3 py-3 px-1 rounded-lg transition-colors',
            item.to && 'cursor-pointer hover:bg-muted/60'
          )}
        >
          {/* Icon */}
          <div className={cn(
            'mt-0.5 shrink-0 rounded-full p-1',
            item.type === 'stockMovement'
              ? item.positive
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger'
              : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'
          )}>
            {item.type === 'stockMovement'
              ? item.positive
                ? <ArrowUpCircle size={16} />
                : <ArrowDownCircle size={16} />
              : <FileText size={16} />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight truncate">{item.label}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.sublabel}</p>
          </div>

          {/* Right side */}
          <div className="shrink-0 text-right">
            {item.type === 'challan' ? (
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase',
                CHALLAN_STATUS_CLASSES[item.meta] ?? 'bg-muted text-muted-foreground'
              )}>
                {item.meta}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">{item.meta}</span>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDateTime(item.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
