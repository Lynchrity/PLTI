import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useApp();

  if (loading) {
    return <main style={{ padding: 40 }}>Loading...</main>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
