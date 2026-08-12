import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface ErrorBannerProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Something went wrong',
  message = 'Failed to load data. Please try again.',
  onRetry,
  className,
}) => (
  <div className={cn(
    'flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5',
    className
  )}>
    <AlertTriangle size={22} className="text-destructive shrink-0" />
    <div className="flex-1 text-center sm:text-left">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                   border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
      >
        <RefreshCw size={13} />
        Retry
      </button>
    )}
  </div>
);
