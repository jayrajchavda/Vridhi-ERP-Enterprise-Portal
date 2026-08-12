import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Sun, Moon, ChevronRight, Home, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../lib/utils';
import { MobileMenuButton } from './Sidebar';
import { CommandPalette } from '../CommandPalette';

const ROLE_COLORS: Record<string, string> = {
  ADMIN:     'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  SALES:     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  WAREHOUSE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ACCOUNTS:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMobileMenuOpen }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Build breadcrumbs dynamically from location pathname
  const crumbs: { label: string; path: string }[] = [];
  const pathname = location.pathname;
  if (pathname === '/') {
    crumbs.push({ label: 'Dashboard', path: '/' });
  } else if (pathname.startsWith('/customers')) {
    crumbs.push({ label: 'Customers', path: '/customers' });
  } else if (pathname.startsWith('/products')) {
    crumbs.push({ label: 'Products', path: '/products' });
  } else if (pathname.startsWith('/challans')) {
    crumbs.push({ label: 'Sales Challans', path: '/challans' });
  }

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <MobileMenuButton onClick={onMobileMenuOpen} />

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <Home size={14} className="text-muted-foreground" />
          {crumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              <ChevronRight size={13} className="text-muted-foreground/50" />
              <span className={cn(
                i === crumbs.length - 1
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground cursor-pointer'
              )}>
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Command Palette Button */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Quick search (Ctrl+K)"
        >
          <Search size={14} />
          <span>Quick search...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+K</kbd>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User + role */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-2">
            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">{user.name}</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide', ROLE_COLORS[user.role])}>
              {user.role}
            </span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                     text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors"
          aria-label="Logout"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </header>
  );
};
