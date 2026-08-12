import React from 'react';
import { cn } from '../lib/utils';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} />
);

interface LoadingSkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const LoadingSkeletonTable: React.FC<LoadingSkeletonTableProps> = ({
  rows = 5,
  columns = 5,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[120px]" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 px-4 py-3.5 border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={cn('h-4 flex-1', colIdx === 0 ? 'max-w-[160px]' : 'max-w-[100px]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const LoadingSkeletonCards: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card border rounded-xl p-5 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-2 w-32" />
      </div>
    ))}
  </div>
);
