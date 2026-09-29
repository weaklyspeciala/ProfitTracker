import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Expenses } from './pages/Expenses';
import { Investments } from './pages/Investments';
import { Sales } from './pages/Sales';
import { ProductsStock } from './pages/ProductsStock';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { useAppStore } from './store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkSession } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    const interval = setInterval(() => {
      checkSession();
      if (!useAppStore.getState().isAuthenticated) {
        navigate('/login', { replace: true });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkSession, navigate]);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="investments" element={<Investments />} />
        <Route path="products" element={<ProductsStock />} />
        <Route path="sales" element={<Sales />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
