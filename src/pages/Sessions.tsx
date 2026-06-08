import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { getUserSchedules } from '../services/scheduleService';
import { supabase } from '../services/supabase';
import type { Schedule } from '../types';
import { formatSessionDateTime } from '../utils/timezone';
import shared from '../styles/shared.module.css';

export function Sessions() {
  const { profile } = useApp();
  const [sessions, setSessions] = useState<(Schedule & { title?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const all = await getUserSchedules(profile!.user_id);
      const mine = all.filter((s) => s.participant_id === profile!.user_id);

      const serviceIds = mine.map((s) => s.service_id);
      const { data: services } = await supabase
        .from('services')
        .select('service_id, title')
        .in('service_id', serviceIds.length ? serviceIds : ['00000000-0000-0000-0000-000000000000']);

      const titleMap = new Map((services ?? []).map((s) => [s.service_id, s.title]));

      setSessions(mine.map((s) => ({ ...s, title: titleMap.get(s.service_id) })));
      setLoading(false);
    }

    load();
  }, [profile]);

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Sessions</h1>
      <p className={shared.pageSubtitle}>All sessions where you are the tutor.</p>

      {loading ? (
        <p>Loading…</p>
      ) : sessions.length === 0 ? (
        <p className={shared.empty}>No sessions yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map((s) => (
            <li
              key={s.schedule_id}
              className={shared.card}
              style={{
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{s.title ?? 'Session'}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-muted)' }}>
                  {formatSessionDateTime(s.session_start)} · {s.status}
                </p>
              </div>
              <Link to={`/sessions/${s.schedule_id}`} className={shared.btnPrimary}>
                View Session Details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
