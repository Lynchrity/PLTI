import { Navbar } from '../Navbar/Navbar';
import styles from './AppLayout.module.css';

export function AppLayout({
  children,
  fullBleed = false,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={fullBleed ? styles.mainFullBleed : styles.main}>{children}</main>
    </div>
  );
}
