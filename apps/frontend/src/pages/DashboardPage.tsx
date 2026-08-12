import React from 'react';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

export const DashboardPage: React.FC = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome to your operations overview</p>
      </div>
      <EmptyState
        icon={TrendingUp}
        title="Dashboard coming soon"
        description="Full analytics, KPI cards, and activity feeds will be available in PROMPT 8."
      />
    </div>
  );
};
