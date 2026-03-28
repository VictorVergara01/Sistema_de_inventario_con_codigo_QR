import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { getLandingPath } from '../lib/role-access';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={getLandingPath(user?.role)} replace />;
  }

  return children;
}
