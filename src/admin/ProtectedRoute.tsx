import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export function ProtectedRoute() {
  const { session, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-rose-50/50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="h-4 w-2/3 animate-pulse rounded bg-rose-100" aria-hidden="true" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-rose-100" aria-hidden="true" />
          <p className="mt-4 text-sm text-gray-500">Проверяем сессию...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
