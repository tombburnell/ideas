import { Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import { AppShell } from './components/app-shell';
import { LoginPage } from './pages/LoginPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { TenantDetailPage } from './pages/TenantDetailPage';
import { PlanDetailPage } from './pages/PlanDetailPage';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="customers/:id/tenants/:tenantId" element={<TenantDetailPage />} />
        <Route path="customers/:id/tenants/:tenantId/plans/:planId" element={<PlanDetailPage />} />
      </Route>
    </Routes>
  );
}
