import { Link, useLocation } from 'react-router-dom';
import { AppLogo } from '../AppLogo/AppLogo';
import { getNavItems } from '../../constants/navigation';
import { useApp } from '../../context/AppContext';
import { logout } from '../../services/authService';
import styles from './Navbar.module.css';

export function Navbar() {
  const { profile, role, isAdmin } = useApp();
  const location = useLocation();
  const navItems = getNavItems(role, isAdmin);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const initials = profile?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <nav className={styles.navbar}>
      <Link to="/dashboard" className={styles.logo}>
        <AppLogo size={36} showWordmark />
      </Link>

      <ul className={styles.navLinks}>
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`)
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : styles.navLink
              }
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.navRight}>
        {profile && (
          <span className={styles.greeting}>Hello, {profile.name.split(' ')[0]}</span>
        )}
        <Link to="/profile" className={styles.avatar} title={profile?.name ?? 'Profile'}>
          {profile?.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt="" className={styles.avatarImage} />
          ) : (
            initials
          )}
        </Link>
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
