import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './authContext';

/** Renders child routes for signed-in users; otherwise redirects to /login. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where the user was going so login can send them back.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
