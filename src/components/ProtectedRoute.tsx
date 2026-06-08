import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, role, isAdmin, tutorApplicationStatus, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return <main style={{ padding: 40 }}>Loading...</main>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const isUnapprovedTutor =
    role === 'tutor' && !isAdmin && tutorApplicationStatus !== 'approved';

  if (isUnapprovedTutor && location.pathname !== '/tutor/pending') {
    return <Navigate to="/tutor/pending" replace />;
  }

  if (role === 'tutor' && profile.is_suspended && location.pathname !== '/tutor/pending') {
    return <Navigate to="/tutor/pending" replace />;
  }

  return children;
}
