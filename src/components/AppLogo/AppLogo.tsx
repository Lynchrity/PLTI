import { APP_NAME } from '../../constants/app';
import { LogoMark } from '../../icons/LogoMark';
import styles from './AppLogo.module.css';

interface AppLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function AppLogo({ size = 40, showWordmark = false, className }: AppLogoProps) {
  return (
    <span className={[styles.logo, className].filter(Boolean).join(' ')}>
      <LogoMark size={size} className={styles.icon} title={APP_NAME} />
      {showWordmark && <span className={styles.wordmark}>{APP_NAME}</span>}
    </span>
  );
}
