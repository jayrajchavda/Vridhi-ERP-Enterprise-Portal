import React from 'react';
import { cn } from '../lib/utils';

type Status = 'LEAD' | 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
type Type = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  LEAD:     { label: 'Lead',      cls: 'status-badge-lead' },
  ACTIVE:   { label: 'Active',    cls: 'status-badge-active' },
  INACTIVE: { label: 'Inactive',  cls: 'status-badge-inactive' },
  DRAFT:    { label: 'Draft',     cls: 'status-badge-draft' },
  CONFIRMED:{ label: 'Confirmed', cls: 'status-badge-confirmed' },
  CANCELLED:{ label: 'Cancelled', cls: 'status-badge-cancelled' },
};

const TYPE_MAP: Record<string, { label: string; cls: string }> = {
  RETAIL:      { label: 'Retail',      cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  WHOLESALE:   { label: 'Wholesale',   cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  DISTRIBUTOR: { label: 'Distributor', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
};

export const StatusBadge: React.FC<{ status: Status | string; className?: string }> = ({ status, className }) => {
  const config = STATUS_MAP[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide', config.cls, className)}>
      {config.label}
    </span>
  );
};

export const TypeBadge: React.FC<{ type: Type | string; className?: string }> = ({ type, className }) => {
  const config = TYPE_MAP[type] ?? { label: type, cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', config.cls, className)}>
      {config.label}
    </span>
  );
};
