import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { getUserSchedules } from '../services/scheduleService';
import { supabase } from '../services/supabase';
import type { Schedule } from '../types';
import shared from '../styles/shared.module.css';

export function Requests() {
  const { profile } = useApp();
  const [requests, setRequests] = useState<(Schedule & { title?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const all = await getUserSchedules(profile!.user_id);
      const pending = all.filter(
        (s) =>
          s.participant_id === profile!.user_id &&
          (s.status === 'scheduled' || !s.participant_confirmed),
      );

      const serviceIds = pending.map((p) => p.service_id);
      const { data: services } = await supabase
        .from('services')
        .select('service_id, title')
        .in('service_id', serviceIds.length ? serviceIds : ['00000000-0000-0000-0000-000000000000']);

      const titleMap = new Map((services ?? []).map((s) => [s.service_id, s.title]));

      setRequests(
        pending.map((p) => ({ ...p, title: titleMap.get(p.service_id) })),
      );
      setLoading(false);
    }

    load();
  }, [profile]);

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Requests</h1>
      <p className={shared.pageSubtitle}>Incoming session requests from students.</p>

      {loading ? (
        <p>Loading…</p>
      ) : requests.length === 0 ? (
        <p className={shared.empty}>No pending requests.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((r) => (
            <li key={r.schedule_id} className={shared.card} style={{ padding: 16 }}>
              <strong>{r.title ?? 'Session request'}</strong>
              <p style={{ margin: '4px 0 12px', color: 'var(--color-text-muted)', fontSize: 14 }}>
                {new Date(r.session_start).toLocaleString()} · {r.status}
              </p>
              <Link to={`/sessions/${r.schedule_id}`} className={shared.btnPrimary}>
                View Session Details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
