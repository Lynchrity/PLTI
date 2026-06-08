import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { StartChatButton } from '../components/StartChatButton/StartChatButton';
import { useApp } from '../context/AppContext';
import {
  acceptScheduleRequest,
  getPendingRequestsForTutor,
  processAllScheduleUpdates,
  rejectScheduleRequest,
  type ScheduleRequestWithDetails,
} from '../services/scheduleService';
import { APP_TIMEZONE_LABEL, formatSessionRange } from '../utils/timezone';
import { getErrorMessage } from '../utils/errors';
import shared from '../styles/shared.module.css';
import styles from './Requests.module.css';

export function Requests() {
  const { profile } = useApp();
  const [requests, setRequests] = useState<ScheduleRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError('');
    try {
      await processAllScheduleUpdates(profile.user_id);
      const data = await getPendingRequestsForTutor(profile.user_id);
      setRequests(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load requests.'));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (scheduleId: string) => {
    setActingId(scheduleId);
    setMessage('');
    setError('');
    try {
      await acceptScheduleRequest(scheduleId);
      setMessage('Request accepted.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to accept request.'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (scheduleId: string) => {
    setActingId(scheduleId);
    setMessage('');
    setError('');
    try {
      await rejectScheduleRequest(scheduleId);
      setMessage('Request rejected. Payment refunded to the student.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reject request.'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <AppLayout>
      <div className={shared.pageContent}>
        <h1 className={shared.pageTitle}>Requests</h1>
        <p className={shared.pageSubtitle}>
          Review incoming session requests. Times are in {APP_TIMEZONE_LABEL}. Unaccepted paid
          requests are auto-refunded after the session start time passes.
        </p>

        {error && <div className={shared.error}>{error}</div>}
        {message && <p className={styles.message}>{message}</p>}

        {loading ? (
          <p>Loading…</p>
        ) : requests.length === 0 ? (
          <p className={shared.empty}>No pending requests.</p>
        ) : (
          <ul className={styles.list}>
            {requests.map((r) => (
              <li key={r.schedule_id} className={`${shared.detailCard} ${styles.card}`}>
                <div className={shared.cardHeader}>{r.service_title ?? 'Session request'}</div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <p className={styles.meta}>
                      From <strong>{r.student_name}</strong>
                    </p>
                    <p className={styles.meta}>
                      {formatSessionRange(r.session_start, r.session_end)}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <StartChatButton peerId={r.initiator_id} peerName={r.student_name} />
                    <button
                      type="button"
                      className={shared.btnPrimary}
                      disabled={actingId === r.schedule_id}
                      onClick={() => handleAccept(r.schedule_id)}
                    >
                      {actingId === r.schedule_id ? 'Working…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      className={shared.btnOutline}
                      disabled={actingId === r.schedule_id}
                      onClick={() => handleReject(r.schedule_id)}
                    >
                      Reject
                    </button>
                    <Link to={`/sessions/${r.schedule_id}`} className={styles.detailsLink}>
                      Details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
