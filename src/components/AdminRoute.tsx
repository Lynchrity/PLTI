import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin } = useApp();

  if (loading) {
    return <main style={{ padding: 40 }}>Loading...</main>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
