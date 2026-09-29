import LinearProgress from '@mui/material/LinearProgress';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Signed-in pages load on demand, keeping the login screen's bundle small.
const InvoiceListPage = lazy(() =>
  import('./pages/InvoiceListPage').then((m) => ({ default: m.InvoiceListPage })),
);
const InvoiceDetailPage = lazy(() =>
  import('./pages/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })),
);
const CreateInvoicePage = lazy(() =>
  import('./pages/CreateInvoicePage').then((m) => ({ default: m.CreateInvoicePage })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<LinearProgress aria-label="Loading page" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<InvoiceListPage />} />
            <Route path="invoices" element={<Navigate to="/" replace />} />
            <Route path="invoices/new" element={<CreateInvoicePage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
