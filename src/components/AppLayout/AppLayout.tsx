import { Navbar } from '../Navbar/Navbar';
import styles from './AppLayout.module.css';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
