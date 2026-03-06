import { Navigate } from 'react-router-dom';

export function AdminIndexRedirect() {
  return <Navigate to="/admin/menu" replace />;
}
