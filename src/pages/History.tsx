import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdminApplicationFilters,
  type SortOrder,
} from '../components/admin/AdminApplicationFilters';
import { TutorApplicationCard } from '../components/admin/TutorApplicationCard';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { getUserSchedules } from '../services/scheduleService';
import { supabase } from '../services/supabase';
import { listTutorApplications, type TutorApplicationWithUser } from '../services/tutorApplicationService';
import type { Schedule } from '../types';
import shared from '../styles/shared.module.css';
import styles from './History.module.css';

type HistoryTab = 'peer' | 'tutoring';

interface ScheduleWithMeta extends Schedule {
  service_type?: string;
  service_title?: string;
  price?: number | null;
}

function AdminApplicationHistory() {
  const [applications, setApplications] = useState<TutorApplicationWithUser[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [submittedDate, setSubmittedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listTutorApplications({
        sortAscending: sortOrder === 'oldest',
        submittedDate: submittedDate || undefined,
      });
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [sortOrder, submittedDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <h1 className={shared.pageTitle}>Application History</h1>
      <p className={shared.pageSubtitle}>
        Browse all tutor applications. Use filters to sort or find submissions by date.
      </p>

      <AdminApplicationFilters
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        submittedDate={submittedDate}
        onSubmittedDateChange={setSubmittedDate}
        onClearDate={() => setSubmittedDate('')}
      />

      {error && <div className={shared.error}>{error}</div>}

      {loading ? (
        <p>Loading applications…</p>
      ) : applications.length === 0 ? (
        <p className={shared.empty}>
          {submittedDate
            ? 'No applications submitted on that date.'
            : 'No applications found.'}
        </p>
      ) : (
        <ul className={styles.applicationList}>
          {applications.map((app) => (
            <TutorApplicationCard key={app.application_id} app={app} />
          ))}
        </ul>
      )}
    </>
  );
}

function UserSessionHistory() {
  const { profile } = useApp();
  const [tab, setTab] = useState<HistoryTab>('tutoring');
  const [schedules, setSchedules] = useState<ScheduleWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const rows = await getUserSchedules(profile!.user_id);
      const serviceIds = [...new Set(rows.map((r) => r.service_id))];

      const { data: services } = await supabase
        .from('services')
        .select('service_id, type, title, price')
        .in('service_id', serviceIds.length ? serviceIds : ['00000000-0000-0000-0000-000000000000']);

      const serviceMap = new Map((services ?? []).map((s) => [s.service_id, s]));

      setSchedules(
        rows.map((r) => {
          const svc = serviceMap.get(r.service_id);
          return {
            ...r,
            service_type: svc?.type,
            service_title: svc?.title,
            price: svc?.price,
          };
        }),
      );
      setLoading(false);
    }

    load();
  }, [profile]);

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      const isPeer =
        s.service_type?.toLowerCase() === 'peer' || s.price === 0;
      return tab === 'peer' ? isPeer : !isPeer;
    });
  }, [schedules, tab]);

  return (
    <>
      <h1 className={shared.pageTitle}>History</h1>
      <p className={shared.pageSubtitle}>Review your peer and tutoring sessions.</p>

      <div className={shared.tabs}>
        <button
          type="button"
          className={tab === 'peer' ? `${shared.tab} ${shared.tabActive}` : shared.tab}
          onClick={() => setTab('peer')}
        >
          Peer History
        </button>
        <button
          type="button"
          className={
            tab === 'tutoring' ? `${shared.tab} ${shared.tabActive}` : shared.tab
          }
          onClick={() => setTab('tutoring')}
        >
          Tutoring History
        </button>
      </div>

      {loading ? (
        <p>Loading history…</p>
      ) : filtered.length === 0 ? (
        <p className={shared.empty}>No {tab === 'peer' ? 'peer' : 'tutoring'} sessions yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((s) => (
            <li
              key={s.schedule_id}
              className={shared.card}
              style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <strong>{s.service_title ?? 'Session'}</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                  {new Date(s.session_start).toLocaleString()} · {s.status}
                </p>
              </div>
              <Link to={`/sessions/${s.schedule_id}`} className={shared.btnPrimary}>
                View Details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function History() {
  const { isAdmin } = useApp();

  return (
    <AppLayout>
      {isAdmin ? <AdminApplicationHistory /> : <UserSessionHistory />}
    </AppLayout>
  );
}
