import { Link } from 'react-router-dom';
import { AppLogo } from '../AppLogo/AppLogo';
import styles from './DashboardNav.module.css';

export type DashboardRole = 'student' | 'tutor';

type DashboardNavProps = {
  role: DashboardRole;
  activePath?: string;
};

const studentLinks = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Find Tutor', to: '/dashboard/find-tutor' },
  { label: 'Courses', to: '/dashboard/courses' },
  { label: 'History', to: '/dashboard/history' },
  { label: 'Profile', to: '/dashboard/profile' },
] as const;

const tutorLinks = [
  { label: 'Dashboard', to: '/dashboard/tutor' },
  { label: 'Requests', to: '/dashboard/tutor/requests' },
  { label: 'Sessions', to: '/dashboard/tutor/sessions' },
  { label: 'Chat', to: '/dashboard/tutor/chat' },
  { label: 'History', to: '/dashboard/tutor/history' },
  { label: 'Profile', to: '/dashboard/tutor/profile' },
] as const;

export function DashboardNav({ role, activePath }: DashboardNavProps) {
  const links = role === 'tutor' ? tutorLinks : studentLinks;
  const accent = role === 'tutor' ? 'tutor' : 'student';

  return (
    <nav className={styles.navbar}>
      <Link to={role === 'tutor' ? '/dashboard/tutor' : '/dashboard'} className={styles.logo}>
        <AppLogo size={40} />
      </Link>

      <ul className={styles.navLinks}>
        {links.map(({ label, to }) => (
          <li key={to}>
            <Link
              to={to}
              className={
                activePath === to || (activePath === undefined && to === links[0].to)
                  ? styles.navLinkActive
                  : styles.navLink
              }
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.navRight}>
        {role === 'student' && (
          <button type="button" className={styles.profileBtn} aria-label="Profile">
            <svg className={styles.profileIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </button>
        )}
        <Link to="/login" className={styles.signUpLink}>
          Sign Up
        </Link>
        <Link
          to="/login"
          className={accent === 'tutor' ? styles.loginBtnTutor : styles.loginBtnStudent}
        >
          Login
        </Link>
      </div>
    </nav>
  );
}
