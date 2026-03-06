import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './admin/AdminLayout';
import { ProtectedRoute } from './admin/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ConstructorPage } from './pages/ConstructorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminIndexRedirect } from './pages/admin/AdminIndexRedirect';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminMenuPage } from './pages/admin/AdminMenuPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/demo-baker" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminIndexRedirect />} />
            <Route path="menu" element={<AdminMenuPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
          </Route>
        </Route>
        <Route path="/:slug" element={<ConstructorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
