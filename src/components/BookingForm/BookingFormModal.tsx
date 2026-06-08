import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { assertChatPeerExists } from '../../services/chatService';
import { bookService } from '../../services/scheduleService';
import { assertSufficientBalance, getWalletBalance } from '../../services/walletService';
import { formatBookingPrice, formatWalletBalance, isPeerService, withAdminFee } from '../../utils/currency';
import type { ServiceWithTutor } from '../../types';
import {
  buildSessionTimes,
  defaultBookingDate,
  defaultBookingTime,
} from '../../utils/sessionTime';
import { APP_TIMEZONE_LABEL, localDateInputValue } from '../../utils/timezone';
import shared from '../../styles/shared.module.css';
import styles from './BookingFormModal.module.css';

export interface BookingSuccessPayload {
  isFree: boolean;
  tutorName: string;
  sessionStart: string;
  amount: number;
  remainingBalance: number;
}

interface BookingFormModalProps {
  service: ServiceWithTutor | null;
  onClose: () => void;
  onSuccess: (payload: BookingSuccessPayload) => void;
}

export function BookingFormModal({ service, onClose, onSuccess }: BookingFormModalProps) {
  const { profile, refreshProfile } = useApp();
  const [date, setDate] = useState(defaultBookingDate);
  const [time, setTime] = useState(defaultBookingTime);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!service) {
    return null;
  }

  const isFree = isPeerService(service.type, service.price);
  const duration = service.duration_minutes ?? 30;
  const minDate = localDateInputValue();
  const baseAmount = isFree ? 0 : Number(service.price ?? 0);
  const totalAmount = isFree ? 0 : withAdminFee(baseAmount);
  const walletBalance = getWalletBalance(profile);
  const insufficient = !isFree && walletBalance < totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    setSubmitting(true);

    try {
      if (!isFree) {
        assertSufficientBalance(walletBalance, totalAmount);
      }

      await assertChatPeerExists(service.creator_id, service.tutor_name);

      const { sessionStart, sessionEnd } = buildSessionTimes(date, time, duration);

      const { remainingBalance } = await bookService({
        serviceId: service.service_id,
        initiatorId: profile.user_id,
        participantId: service.creator_id,
        sessionStart,
        sessionEnd,
        baseAmount,
      });

      await refreshProfile();

      onSuccess({
        isFree,
        tutorName: service.tutor_name,
        sessionStart,
        amount: totalAmount,
        remainingBalance,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-form-title"
      >
        <h2 id="booking-form-title" className={styles.title}>
          Book session
        </h2>
        <p className={styles.subtitle}>
          <strong>{service.title}</strong> with {service.tutor_name} · {duration} min
          <br />
          Times are entered in {APP_TIMEZONE_LABEL} (UTC+7).
        </p>

        {!isFree && (
          <>
            <div className={styles.balanceRow}>
              <span>Wallet balance</span>
              <strong>{formatWalletBalance(walletBalance)}</strong>
            </div>
            <div className={styles.balanceRow}>
              <span>Session price</span>
              <strong>{formatBookingPrice(baseAmount, service.type)}</strong>
            </div>
            {insufficient && (
              <p className={styles.insufficient}>
                Your balance is not enough for this session. Top up your wallet from the dashboard.
              </p>
            )}
          </>
        )}

        {error && <div className={shared.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={shared.formGroup}>
            <label className={shared.label} htmlFor="booking-date">
              Date
            </label>
            <input
              id="booking-date"
              type="date"
              className={shared.input}
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className={shared.formGroup}>
            <label className={shared.label} htmlFor="booking-time">
              Start time
            </label>
            <input
              id="booking-time"
              type="time"
              className={shared.input}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <p className={styles.hint}>
            End time is calculated automatically ({duration} minutes after start).
          </p>

          <div className={styles.actions}>
            <button type="button" className={shared.btnOutline} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={shared.btnPrimary}
              disabled={submitting || insufficient}
            >
              {submitting ? 'Processing…' : isFree ? 'Send request' : 'Pay & send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
