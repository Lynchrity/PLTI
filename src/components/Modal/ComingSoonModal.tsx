import shared from '../../styles/shared.module.css';
import styles from './Modal.module.css';

interface ComingSoonModalProps {
  feature: string;
  onClose: () => void;
}

export function ComingSoonModal({ feature, onClose }: ComingSoonModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coming-soon-title"
      >
        <h2 id="coming-soon-title" className={styles.title}>
          Coming soon
        </h2>
        <p className={styles.subtitle}>
          {feature} top-up is not available yet. Check back later!
        </p>
        <div className={styles.actions}>
          <button type="button" className={shared.btnPrimary} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
