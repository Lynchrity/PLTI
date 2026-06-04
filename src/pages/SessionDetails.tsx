import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { createOrGetChatRoom } from '../services/chatService';
import { getScheduleWithParties } from '../services/scheduleService';
import type { ScheduleWithDetails } from '../types';
import shared from '../styles/shared.module.css';

export function SessionDetails() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { profile } = useApp();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<ScheduleWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!scheduleId || !profile) return;

    getScheduleWithParties(scheduleId, profile.user_id)
      .then(setSchedule)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load session.'))
      .finally(() => setLoading(false));
  }, [scheduleId, profile]);

  const openChat = async () => {
    if (!profile || !schedule) return;
    const otherId =
      schedule.initiator_id === profile.user_id
        ? schedule.participant_id
        : schedule.initiator_id;
    const roomId = await createOrGetChatRoom(profile.user_id, otherId);
    navigate(`/chat?room=${roomId}`);
  };

  return (
    <AppLayout>
      <Link to="/dashboard" style={{ color: 'var(--color-primary)', marginBottom: 16, display: 'inline-block' }}>
        ← Back
      </Link>
      <h1 className={shared.pageTitle}>Session Details</h1>

      {error && <div className={shared.error}>{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : !schedule ? (
        <p className={shared.empty}>Session not found.</p>
      ) : (
        <div className={shared.card} style={{ padding: 24, maxWidth: 560 }}>
          <p>
            <strong>Service:</strong> {schedule.service_title}
          </p>
          <p>
            <strong>Subject:</strong> {schedule.subject} · {schedule.topic}
          </p>
          <p>
            <strong>With:</strong> {schedule.other_party_name}
          </p>
          <p>
            <strong>Start:</strong> {new Date(schedule.session_start).toLocaleString()}
          </p>
          <p>
            <strong>End:</strong> {new Date(schedule.session_end).toLocaleString()}
          </p>
          <p>
            <strong>Duration:</strong> {schedule.duration_minutes ?? '—'} minutes
          </p>
          <p>
            <strong>Status:</strong> {schedule.status}
          </p>
          <p>
            <strong>Confirmations:</strong> Initiator{' '}
            {schedule.initiator_confirmed ? '✓' : '—'}, Participant{' '}
            {schedule.participant_confirmed ? '✓' : '—'}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button type="button" className={shared.btnPrimary} onClick={openChat}>
              Open Chat
            </button>
            <Link to="/history" className={shared.btnOutline}>
              History
            </Link>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
