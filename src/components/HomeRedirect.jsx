import { Navigate } from 'react-router-dom';
import { getToken } from '../api.js';
import { getRole } from '../useCurrentUser.js';

export default function HomeRedirect() {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Navigate to={getRole() === 'ADMIN' ? '/dashboard' : '/products'} replace />;
}