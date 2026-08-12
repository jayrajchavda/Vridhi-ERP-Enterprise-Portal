import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, Role } from '../store/authStore';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ children, allowedRoles, fallback = null }) => {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
};

export const useCanAccess = (allowedRoles: Role[]): boolean => {
  const { user } = useAuthStore();
  return !!user && allowedRoles.includes(user.role);
};
