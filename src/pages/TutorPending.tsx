import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { logout } from '../services/authService';
import styles from './TutorPending.module.css';

export function TutorPending() {
  const { profile, role, tutorApplicationStatus, isAdmin, loading } = useApp();

  useEffect(() => {
    document.documentElement.dataset.theme = 'tutor';
  }, []);

  if (loading) {
    return <main className={styles.page}>Loading...</main>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role !== 'tutor') {
    return <Navigate to="/dashboard" replace />;
  }

  if (tutorApplicationStatus === 'approved') {
    return <Navigate to="/dashboard" replace />;
  }

  const isRejected = tutorApplicationStatus === 'rejected';

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>{isRejected ? '✕' : '⏳'}</div>
        <h1 className={styles.title}>
          {isRejected ? 'Application not approved' : 'Thank you for applying!'}
        </h1>
        <p className={styles.message}>
          {isRejected
            ? 'Your tutor application was not approved. Please contact support if you have questions.'
            : 'Thank you for applying to be a tutor. We are processing your request — this usually takes a few days. You will be able to access tutor features once an admin approves your application.'}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
