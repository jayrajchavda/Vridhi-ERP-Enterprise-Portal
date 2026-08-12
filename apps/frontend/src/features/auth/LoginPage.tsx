import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormData = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Admin',     email: 'admin@demo.com',     role: 'ADMIN' },
  { label: 'Sales',     email: 'sales@demo.com',      role: 'SALES' },
  { label: 'Warehouse', email: 'warehouse@demo.com',  role: 'WAREHOUSE' },
  { label: 'Accounts',  email: 'accounts@demo.com',   role: 'ACCOUNTS' },
];

const ROLE_BADGE: Record<string, string> = {
  ADMIN:     'bg-purple-100 text-purple-700',
  SALES:     'bg-sky-100 text-sky-700',
  WAREHOUSE: 'bg-amber-100 text-amber-700',
  ACCOUNTS:  'bg-green-100 text-green-700',
};

export const LoginPage: React.FC = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await api.post('/auth/login', data);
      const { token, user } = res.data.data;
      // Sync token to localStorage for Axios interceptor
      localStorage.setItem('token', token);
      setAuth(user, token);
      toast.success(`Welcome back, ${user.name}!`, { description: `Logged in as ${user.role}` });
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.status === 401) {
        toast.error('Login failed', { description: 'Invalid email or password. Please try again.' });
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-sidebar p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Vridhi ERP</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Vridhi<br />ERP
          </h1>
          <p className="text-sidebar-foreground/60 text-base leading-relaxed max-w-xs">
            Manage customers, inventory, and sales challans in one unified workspace.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              { label: 'Customers', value: 'CRM & Leads' },
              { label: 'Inventory', value: 'Real-time Stock' },
              { label: 'Challans', value: 'Sales Workflow' },
              { label: 'Dashboard', value: 'Live Analytics' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-sidebar-foreground/50 mb-0.5">{item.label}</div>
                <div className="text-sm font-medium text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sidebar-foreground/30 text-xs">© 2026 Vridhi ERP. All rights reserved.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-foreground">Vridhi ERP</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
            <p className="text-muted-foreground text-sm mt-1">Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder="you@example.com"
                className={cn(
                  'w-full px-3.5 py-2.5 text-sm rounded-lg border bg-background text-foreground',
                  'outline-none transition-all duration-150',
                  'focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
                  errors.email ? 'border-destructive' : 'border-border hover:border-brand-400'
                )}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  placeholder="••••••••"
                  className={cn(
                    'w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border bg-background text-foreground',
                    'outline-none transition-all duration-150',
                    'focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
                    errors.password ? 'border-destructive' : 'border-border hover:border-brand-400'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold',
                'bg-brand-500 hover:bg-brand-600 text-white transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md'
              )}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Quick access — demo accounts (password: <code className="bg-muted px-1 rounded">Passw0rd!</code>)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setValue('email', acc.email);
                    setValue('password', 'Passw0rd!');
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-brand-400
                             hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all text-left group"
                >
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase', ROLE_BADGE[acc.role])}>
                    {acc.role.charAt(0)}
                  </span>
                  <span className="text-xs text-foreground group-hover:text-brand-600 font-medium">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
