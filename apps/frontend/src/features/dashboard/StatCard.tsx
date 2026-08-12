import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string };
  to?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  to,
  className,
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => to && navigate(to)}
      className={cn(
        'stat-card group select-none',
        to && 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-700',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon size={17} className={iconColor} />
        </div>
      </div>

      <div className="mt-1">
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {trend && (
        <div className={cn(
          'flex items-center gap-1 mt-3 text-xs font-medium',
          trend.value >= 0 ? 'text-success' : 'text-danger'
        )}>
          {trend.value >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
          <span className="text-muted-foreground font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  );
};
