import { formatPriceIdrPlain, formatWalletBalance } from '../../utils/currency';
import { formatSessionDateTime } from '../../utils/timezone';
import shared from '../../styles/shared.module.css';
import styles from './Modal.module.css';

export interface PaymentConfirmedDetails {
  amount: number;
  tutorName: string;
  sessionStart: string;
  remainingBalance: number;
}

interface PaymentConfirmedModalProps {
  details: PaymentConfirmedDetails;
  onClose: () => void;
}

export function PaymentConfirmedModal({ details, onClose }: PaymentConfirmedModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-confirmed-title"
      >
        <div className={styles.confirmedIcon} aria-hidden>
          ✓
        </div>
        <h2 id="payment-confirmed-title" className={styles.title}>
          Payment confirmed
        </h2>
        <p className={styles.subtitle}>
          {formatPriceIdrPlain(details.amount)} has been deducted from your wallet.
          Your booking request was sent to <strong>{details.tutorName}</strong> for{' '}
          {formatSessionDateTime(details.sessionStart)}.
        </p>
        <p className={styles.subtitle} style={{ marginBottom: 0 }}>
          Remaining balance: <strong>{formatWalletBalance(details.remainingBalance)}</strong>
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
