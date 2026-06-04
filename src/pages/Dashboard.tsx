import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TutorApplicationCard } from '../components/admin/TutorApplicationCard';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { getUpcomingSchedule, getUserSchedules } from '../services/scheduleService';
import {
  listTutorApplications,
  reviewTutorApplication,
  type TutorApplicationWithUser,
} from '../services/tutorApplicationService';
import type { Schedule, ScheduleWithDetails } from '../types';
import shared from '../styles/shared.module.css';
import styles from './Dashboard.module.css';

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function StudentDashboard({ name, recentSchedules }: { name: string; recentSchedules: Schedule[] }) {
  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <h1>Hi, {name}! Ready to solve your unanswered questions?</h1>
        <p>Find a peer or tutor for your specific topic in seconds.</p>
        <div className={styles.actions}>
          <Link to="/search?type=tutoring" className={shared.btnPrimary}>
            Request a Tutor now
          </Link>
          <Link to="/search?type=peer" className={shared.btnOutline}>
            Request a Peer now ↗
          </Link>
        </div>
      </section>

      <section className={styles.widgets}>
        <div className={`${styles.widget} ${styles.widgetFull}`}>
          <div className={styles.widgetHeader}>🎯 Session Status</div>
          <div className={styles.widgetBody}>
            <p className={styles.statusText}>
              Current Status: <strong>No Active Sessions</strong>
            </p>
            <div className={styles.illustration}>📚</div>
            <p className={styles.widgetFooter}>Your desk is ready when you are.</p>
          </div>
        </div>

        <div className={styles.widget}>
          <div className={styles.widgetHeader}>🔍 Active Matches</div>
          <div className={styles.widgetBody}>
            <p className={styles.statusText}>
              Scanning for available tutors for your subjects… ✨
            </p>
            <Link to="/search" className={shared.btnPrimary} style={{ marginTop: 12 }}>
              Browse Search
            </Link>
          </div>
        </div>

        <div className={styles.widget}>
          <div className={styles.widgetHeader}>📝 Recent Session History</div>
          <div className={styles.widgetBody}>
            {recentSchedules.length === 0 ? (
              <p className={shared.empty}>No sessions yet.</p>
            ) : (
              <ul className={styles.historyList}>
                {recentSchedules.slice(0, 3).map((s) => (
                  <li key={s.schedule_id} className={styles.historyItem}>
                    <span>✓</span>
                    <span>
                      Session ({s.status}) — {formatRelativeDate(s.session_start)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/history" className={styles.viewAll}>
              View all
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function TutorDashboard({
  name,
  upcoming,
  recentSchedules,
}: {
  name: string;
  upcoming: ScheduleWithDetails | null;
  recentSchedules: Schedule[];
}) {
  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <h1>Hi, {name}! Ready to solve your students&apos; worries?</h1>
        <p>Manage your services, sessions, and availability from one place.</p>
        <div className={styles.actions}>
          <Link to="/services" className={shared.btnPrimary}>
            Manage Services
          </Link>
          <Link to="/requests" className={shared.btnOutline}>
            View Requests
          </Link>
        </div>
      </section>

      <section className={styles.widgets}>
        <div className={`${styles.widget} ${styles.widgetFull}`}>
          <div className={styles.widgetHeader}>Your Next Session</div>
          <div className={styles.widgetBody}>
            {upcoming ? (
              <>
                <div className={styles.sessionDetail}>
                  <span>
                    <strong>Student:</strong> {upcoming.other_party_name}
                  </span>
                  <span>
                    <strong>Topic:</strong> {upcoming.topic ?? upcoming.subject} (
                    {upcoming.subject})
                  </span>
                  <span>
                    <strong>Duration:</strong> {upcoming.duration_minutes ?? 30} Minutes
                  </span>
                  <span>
                    <strong>Date &amp; Time:</strong>{' '}
                    {new Date(upcoming.session_start).toLocaleString()} –{' '}
                    {new Date(upcoming.session_end).toLocaleTimeString()}
                  </span>
                  <span>
                    <strong>Status:</strong> {upcoming.status}
                  </span>
                </div>
                <Link
                  to={`/sessions/${upcoming.schedule_id}`}
                  className={shared.btnPrimary}
                >
                  View Session Details
                </Link>
              </>
            ) : (
              <p className={shared.empty}>No upcoming sessions scheduled.</p>
            )}
          </div>
        </div>

        <div className={styles.widget}>
          <div className={styles.widgetHeader}>Availability Status</div>
          <div className={styles.widgetBody}>
            <p className={styles.available}>✓ Available</p>
          </div>
        </div>

        <div className={styles.widget}>
          <div className={styles.widgetHeader}>📝 Recent Session History</div>
          <div className={styles.widgetBody}>
            {recentSchedules.length === 0 ? (
              <p className={shared.empty}>No sessions yet.</p>
            ) : (
              <ul className={styles.historyList}>
                {recentSchedules.slice(0, 3).map((s) => (
                  <li key={s.schedule_id} className={styles.historyItem}>
                    <span>✓</span>
                    <span>
                      {s.status} — {formatRelativeDate(s.session_start)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/history" className={styles.viewAll}>
              View all
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminDashboard() {
  const [applications, setApplications] = useState<TutorApplicationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listTutorApplications({ status: 'pending', sortAscending: false });
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (
    applicationId: string,
    status: 'approved' | 'rejected',
  ) => {
    setMessage('');
    setError('');
    try {
      await reviewTutorApplication(applicationId, status);
      setMessage(`Application ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application.');
    }
  };

  return (
    <>
      <h1 className={shared.pageTitle}>Tutor Applications</h1>
      <p className={shared.pageSubtitle}>
        Review pending tutor signups. View past decisions on History.
      </p>

      {error && <div className={shared.error}>{error}</div>}
      {message && <p style={{ color: '#16a34a', marginBottom: 16 }}>{message}</p>}

      {loading ? (
        <p>Loading applications…</p>
      ) : applications.length === 0 ? (
        <p className={shared.empty}>No pending applications.</p>
      ) : (
        <ul className={styles.applicationList}>
          {applications.map((app) => (
            <TutorApplicationCard
              key={app.application_id}
              app={app}
              showActions
              onApprove={(id) => handleReview(id, 'approved')}
              onReject={(id) => handleReview(id, 'rejected')}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function Dashboard() {
  const { profile, role, isAdmin } = useApp();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduleWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || isAdmin) {
      if (isAdmin) {
        setLoading(false);
      }
      return;
    }

    async function load() {
      try {
        const all = await getUserSchedules(profile!.user_id);
        setSchedules(all);

        if (role === 'tutor') {
          const next = await getUpcomingSchedule(profile!.user_id, 'tutor');
          setUpcoming(next);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [profile, role, isAdmin]);

  const firstName = profile?.name?.split(' ')[0] ?? 'there';

  return (
    <AppLayout>
      {isAdmin ? (
        <AdminDashboard />
      ) : loading ? (
        <p>Loading dashboard…</p>
      ) : role === 'tutor' ? (
        <TutorDashboard
          name={firstName}
          upcoming={upcoming}
          recentSchedules={schedules}
        />
      ) : (
        <StudentDashboard name={firstName} recentSchedules={schedules} />
      )}
    </AppLayout>
  );
}
