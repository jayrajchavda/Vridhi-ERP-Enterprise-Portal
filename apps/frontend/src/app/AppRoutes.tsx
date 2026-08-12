import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CustomersListPage } from '../features/customers/CustomersListPage';
import { ProductsListPage } from '../features/products/ProductsListPage';
import { ChallansListPage } from '../features/challans/ChallansListPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';

// Procurement Screens
import { VendorsPage } from '../features/procurement/VendorsPage';
import { PurchaseOrdersPage } from '../features/procurement/PurchaseOrdersPage';
import { NewPurchaseOrderPage } from '../features/procurement/NewPurchaseOrderPage';
import { PurchaseOrderDetailPage } from '../features/procurement/PurchaseOrderDetailPage';
import { ReorderSuggestionsPage } from '../features/procurement/ReorderSuggestionsPage';

// Invoices Screens
import { InvoicesPage } from '../features/invoices/InvoicesPage';
import { InvoiceDetailPage } from '../features/invoices/InvoiceDetailPage';

// Follow-ups Screens
import { FollowUpsDashboardPage } from '../features/followups/FollowUpsDashboardPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route
                  path="/"
                  element={<DashboardPage />}
                  handle={{ breadcrumb: 'Dashboard' }}
                />
                <Route
                  path="/customers/*"
                  element={<CustomersListPage />}
                  handle={{ breadcrumb: 'Customers' }}
                />
                <Route
                  path="/products/*"
                  element={<ProductsListPage />}
                  handle={{ breadcrumb: 'Products' }}
                />
                <Route
                  path="/challans/*"
                  element={<ChallansListPage />}
                  handle={{ breadcrumb: 'Sales Challans' }}
                />
                <Route
                  path="/vendors/*"
                  element={<VendorsPage />}
                />
                <Route
                  path="/purchase-orders"
                  element={<PurchaseOrdersPage />}
                />
                <Route
                  path="/purchase-orders/new"
                  element={<NewPurchaseOrderPage />}
                />
                <Route
                  path="/purchase-orders/:id"
                  element={<PurchaseOrderDetailPage />}
                />
                <Route
                  path="/procurement/suggestions"
                  element={<ReorderSuggestionsPage />}
                />
                <Route
                  path="/invoices"
                  element={<InvoicesPage />}
                />
                <Route
                  path="/invoices/:id"
                  element={<InvoiceDetailPage />}
                />
                <Route
                  path="/follow-ups"
                  element={<FollowUpsDashboardPage />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};
