import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <div className="auth-loading">Loading your CareerAI workspace…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.onboardingCompleted && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  if (user.onboardingCompleted && location.pathname === '/onboarding') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
