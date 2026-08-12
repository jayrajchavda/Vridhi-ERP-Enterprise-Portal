import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText, ChevronLeft,
  ChevronRight, Menu, AlertTriangle, Truck, ShoppingBag, Receipt, CalendarClock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',       to: '/',               icon: LayoutDashboard, roles: ['ADMIN','SALES','WAREHOUSE','ACCOUNTS'] },
  { label: 'Customers',       to: '/customers',      icon: Users,           roles: ['ADMIN','SALES','ACCOUNTS'] },
  { label: 'Products',        to: '/products',       icon: Package,         roles: ['ADMIN','SALES','WAREHOUSE','ACCOUNTS'] },
  { label: 'Sales Challans',  to: '/challans',       icon: FileText,        roles: ['ADMIN','SALES','WAREHOUSE','ACCOUNTS'] },
  { label: 'Vendors',         to: '/vendors',        icon: Truck,           roles: ['ADMIN','SALES','ACCOUNTS'] },
  { label: 'Purchase Orders', to: '/purchase-orders', icon: ShoppingBag,     roles: ['ADMIN','SALES','WAREHOUSE','ACCOUNTS'] },
  { label: 'Tax Invoices',    to: '/invoices',       icon: Receipt,         roles: ['ADMIN','SALES','ACCOUNTS'] },
  { label: 'Follow-ups',      to: '/follow-ups',     icon: CalendarClock,   roles: ['ADMIN','SALES','ACCOUNTS'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock-count'],
    queryFn: () => api.get('/products/low-stock').then(r => r.data.data),
    refetchInterval: 60_000,
    enabled: !!user,
  });

  const lowStockCount = Array.isArray(lowStockData) ? lowStockData.length : 0;

  const { data: overdueData } = useQuery({
    queryKey: ['follow-ups-overdue-count'],
    queryFn: () => api.get('/customers/follow-ups?range=overdue').then(r => r.data.data),
    refetchInterval: 30_000,
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'SALES' || user.role === 'ACCOUNTS'),
  });

  const overdueCount = Array.isArray(overdueData) ? overdueData.length : 0;

  const filtered = navItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        'transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo area */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white leading-tight">Vridhi ERP</div>
            <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Enterprise Portal</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filtered.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);
          const isProducts = item.to === '/products';
          const isFollowups = item.to === '/follow-ups';

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn('nav-link group relative', isActive && 'active')}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {isProducts && lowStockCount > 0 && (
                <span className={cn(
                  'flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500 text-white',
                  collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'w-5 h-5 ml-auto'
                )}>
                  {lowStockCount > 9 ? '9+' : lowStockCount}
                </span>
              )}
              {isFollowups && overdueCount > 0 && (
                <span className={cn(
                  'flex items-center justify-center rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse',
                  collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'w-5 h-5 ml-auto'
                )}>
                  {overdueCount > 9 ? '9+' : overdueCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Low stock warning */}
      {!collapsed && lowStockCount > 0 && (
        <div className="m-3 p-3 rounded-lg bg-amber-500/15 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
            <AlertTriangle size={13} />
            <span>{lowStockCount} low-stock item{lowStockCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* User info */}
      {!collapsed && user && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 rounded-lg bg-white/5">
            <div className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</div>
            <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wide mt-0.5">{user.role}</div>
          </div>
        </div>
      )}
    </aside>
  );
};

export const MobileMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
    aria-label="Open navigation menu"
  >
    <Menu size={20} />
  </button>
);
