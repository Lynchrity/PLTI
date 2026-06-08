import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AdminApplicationFilters,
  type SortOrder,
} from '../components/admin/AdminApplicationFilters';
import { TutorApplicationCard } from '../components/admin/TutorApplicationCard';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { formatScheduleStatus } from '../services/attendanceService';
import {
  cancelScheduleRequest,
  getUserSchedules,
  processAllScheduleUpdates,
} from '../services/scheduleService';
import { supabase } from '../services/supabase';
import { listTutorApplications, type TutorApplicationWithUser } from '../services/tutorApplicationService';
import type { Schedule } from '../types';
import { isPeerService } from '../utils/currency';
import { APP_TIMEZONE_LABEL, formatSessionDateTime } from '../utils/timezone';
import { getErrorMessage } from '../utils/errors';
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
  const { profile, refreshProfile } = useApp();
  const location = useLocation();
  const [tab, setTab] = useState<HistoryTab>('tutoring');
  const [schedules, setSchedules] = useState<ScheduleWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    await processAllScheduleUpdates(profile.user_id);
    const rows = await getUserSchedules(profile.user_id);
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
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    load()
      .catch((err) => setError(getErrorMessage(err, 'Failed to load history.')))
      .finally(() => setLoading(false));
  }, [profile, load, location.key]);

  useEffect(() => {
    const refresh = () => {
      if (!profile) return;
      load().catch(() => undefined);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [profile, load]);

  const handleCancel = async (scheduleId: string) => {
    if (!window.confirm('Cancel this request? Paid sessions will be refunded.')) return;
    setActingId(scheduleId);
    setError('');
    try {
      await cancelScheduleRequest(scheduleId);
      await refreshProfile();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to cancel request.'));
    } finally {
      setActingId(null);
    }
  };

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      const isPeer = isPeerService(s.service_type ?? '', s.price ?? null);
      return tab === 'peer' ? isPeer : !isPeer;
    });
  }, [schedules, tab]);

  return (
    <>
      <div className={shared.pageContent}>
        <h1 className={shared.pageTitle}>History</h1>
        <p className={shared.pageSubtitle}>
          Review your peer and tutoring sessions. Times are in {APP_TIMEZONE_LABEL}.
        </p>

        {error && <div className={shared.error}>{error}</div>}

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
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((s) => {
            const canCancel =
              profile &&
              s.initiator_id === profile.user_id &&
              s.status === 'scheduled' &&
              !s.participant_confirmed;

            return (
              <li key={s.schedule_id} className={shared.detailCard}>
                <div className={shared.cardHeader}>{s.service_title ?? 'Session'}</div>
                <div
                  className={shared.detailCardBody}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
                >
                  <div>
                    <p className={shared.detailRow}>
                      <strong>When</strong>
                      {formatSessionDateTime(s.session_start)}
                    </p>
                    <p className={shared.detailRow}>
                      <strong>Status</strong>
                      {formatScheduleStatus(s.status, s)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {canCancel && (
                      <button
                        type="button"
                        className={shared.btnOutline}
                        disabled={actingId === s.schedule_id}
                        onClick={() => handleCancel(s.schedule_id)}
                      >
                        Cancel request
                      </button>
                    )}
                    <Link to={`/sessions/${s.schedule_id}`} className={shared.btnPrimary}>
                      View Details
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
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
