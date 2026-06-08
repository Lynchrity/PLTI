import shared from '../../styles/shared.module.css';
import styles from './Modal.module.css';

interface TopUpModalProps {
  onClose: () => void;
  onSelectMethod: (method: string) => void;
}

const PAYMENT_METHODS = ['GoPay', 'OVO', 'BCA Virtual Account'] as const;

export function TopUpModal({ onClose, onSelectMethod }: TopUpModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="top-up-title"
      >
        <h2 id="top-up-title" className={styles.title}>
          Top up wallet
        </h2>
        <p className={styles.subtitle}>Choose a payment method to add funds to your wallet.</p>

        <ul className={styles.methodList}>
          {PAYMENT_METHODS.map((method) => (
            <li key={method}>
              <button
                type="button"
                className={styles.methodBtn}
                onClick={() => onSelectMethod(method)}
              >
                {method}
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button type="button" className={shared.btnOutline} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
