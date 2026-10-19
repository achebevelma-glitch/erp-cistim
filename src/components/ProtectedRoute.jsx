import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../api.js';
import { getRole } from '../useCurrentUser.js';

export default function ProtectedRoute({ roles, children }) {
  const { pathname } = useLocation();

  if (!getToken()) return <Navigate to="/login" replace />;

  const role = getRole();
  if (roles && !roles.includes(role)) {
    // Never redirect /products to itself
    return <Navigate to={pathname === '/products' ? '/login' : '/products'} replace />;
  }
  return children;
}