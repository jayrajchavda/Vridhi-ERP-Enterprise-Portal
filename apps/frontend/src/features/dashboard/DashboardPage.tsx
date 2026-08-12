import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Package, FileText, IndianRupee,
  AlertTriangle, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { fetchDashboardSummary } from './dashboard.api';
import { StatCard } from './StatCard';
import { CustomerDonutChart } from './CustomerDonutChart';
import { ChallanBarChart } from './ChallanBarChart';
import { ActivityFeed } from './ActivityFeed';
import { LoadingSkeletonCards } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardSummary,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const isWarehouse = user?.role === 'WAREHOUSE';
  const isAccounts  = user?.role === 'ACCOUNTS';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-subtle" />
          Live · auto-refreshes every minute
        </div>
      </div>

      {isError && (
        <ErrorBanner
          title="Failed to load dashboard"
          message="Could not retrieve dashboard data. Check if the backend is running."
          onRetry={() => refetch()}
        />
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <LoadingSkeletonCards count={4} />
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Customers — hide for warehouse */}
          {!isWarehouse && (
            <StatCard
              title="Total Customers"
              value={data.customers.total}
              subtitle={`${data.customers.byStatus['ACTIVE'] ?? 0} active · ${data.customers.byStatus['LEAD'] ?? 0} leads`}
              icon={Users}
              iconBg="bg-sky-100 dark:bg-sky-900/30"
              iconColor="text-sky-600 dark:text-sky-300"
              to="/customers"
            />
          )}

          {/* Products */}
          <StatCard
            title="Total Products"
            value={data.products.total}
            subtitle={
              data.products.lowStockCount > 0
                ? `⚠ ${data.products.lowStockCount} below min stock`
                : 'All stock levels OK'
            }
            icon={Package}
            iconBg={data.products.lowStockCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}
            iconColor={data.products.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-green-600 dark:text-green-300'}
            to="/products"
          />

          {/* Challans this month */}
          <StatCard
            title="Challans This Month"
            value={data.challans.CONFIRMED + data.challans.DRAFT}
            subtitle={`${data.challans.CONFIRMED} confirmed · ${data.challans.DRAFT} draft`}
            icon={FileText}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-300"
            to="/challans"
          />

          {/* Revenue — show for admin + accounts */}
          {(user?.role === 'ADMIN' || isAccounts) && (
            <StatCard
              title="Confirmed Revenue"
              value={formatCurrency(data.challans.confirmedTotalAmount || '0')}
              subtitle="This calendar month"
              icon={IndianRupee}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              iconColor="text-emerald-600 dark:text-emerald-300"
            />
          )}

          {/* Low stock alert — prominent for warehouse */}
          {isWarehouse && data.products.lowStockCount > 0 && (
            <StatCard
              title="Low Stock Alert"
              value={data.products.lowStockCount}
              subtitle="Products below min threshold"
              icon={AlertTriangle}
              iconBg="bg-amber-100 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-300"
              to="/products?lowStock=true"
            />
          )}
        </div>
      ) : null}

      {/* Charts + Activity row */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Customer status donut */}
          {!isWarehouse && (
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-4">Customer Status</h2>
              <CustomerDonutChart data={data.customers.byStatus} />
            </div>
          )}

          {/* Challan status bar */}
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-1">Challan Status (This Month)</h2>
            <div className="flex gap-3 mb-3">
              {[
                { label: 'Draft', count: data.challans.DRAFT, icon: Clock, cls: 'text-warning' },
                { label: 'Confirmed', count: data.challans.CONFIRMED, icon: CheckCircle2, cls: 'text-success' },
                { label: 'Cancelled', count: data.challans.CANCELLED, icon: XCircle, cls: 'text-danger' },
              ].map(({ label, count, icon: Icon, cls }) => (
                <div key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon size={12} className={cls} />
                  <span className="font-medium text-foreground">{count}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <ChallanBarChart data={data.challans} />
          </div>

          {/* Activity feed — takes remaining space */}
          <div className={`bg-card border rounded-xl p-5 shadow-sm ${!isWarehouse ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h2>
            <ActivityFeed
              stockMovements={data.recentActivity.stockMovements}
              challans={data.recentActivity.challans}
            />
          </div>
        </div>
      )}

      {/* Challan quick stats row */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Draft',
              value: data.challans.DRAFT,
              icon: Clock,
              iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
              iconColor: 'text-yellow-600 dark:text-yellow-300',
              to: '/challans?status=DRAFT',
            },
            {
              label: 'Confirmed',
              value: data.challans.CONFIRMED,
              icon: CheckCircle2,
              iconBg: 'bg-green-100 dark:bg-green-900/30',
              iconColor: 'text-green-600 dark:text-green-300',
              to: '/challans?status=CONFIRMED',
            },
            {
              label: 'Cancelled',
              value: data.challans.CANCELLED,
              icon: XCircle,
              iconBg: 'bg-red-100 dark:bg-red-900/30',
              iconColor: 'text-red-600 dark:text-red-300',
              to: '/challans?status=CANCELLED',
            },
          ].map(({ label, value, icon, iconBg, iconColor, to }) => (
            <StatCard
              key={label}
              title={`${label} Challans`}
              value={value}
              subtitle="This month"
              icon={icon}
              iconBg={iconBg}
              iconColor={iconColor}
              to={to}
            />
          ))}
        </div>
      )}
    </div>
  );
};
