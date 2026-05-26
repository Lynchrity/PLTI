import { DashboardNav } from '../components/dashboard/DashboardNav';
import styles from './Dashboard.module.css';

/** Placeholder session data — replace with Supabase / API later */
const PLACEHOLDER_SESSION = {
  studentName: 'Frederick Samuel',
  tutorName: 'Kenny Jingga',
  topic: 'Vector (Calculus)',
  duration: '30 Minutes',
  dateTime: 'Monday, 17th April 13.00 - 13.30',
  status: 'Confirmed',
} as const;

const PLACEHOLDER_HISTORY = [
  'Session with Prof. Kenny Jingga (Software Engineering) - 2 days ago',
  'Peer Review (English) - 2 days ago',
] as const;

type StudentDashboardProps = {
  userName?: string;
  hasActiveSession?: boolean;
};

function StudentDashboard({
  userName = 'Person',
  hasActiveSession = false,
}: StudentDashboardProps) {
  return (
    <div className={styles.page}>
      <DashboardNav role="student" activePath="/dashboard" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Hi, {userName}! Ready to solve your unanswered questions?
          </h1>
          <p className={styles.heroSubtitle}>
            Find a peer or tutor for your specific topic in seconds.
          </p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.btnPrimaryStudent}>
              Request a Tutor now
            </button>
            <button type="button" className={styles.btnOutlineStudent}>
              Request a Peer now
              <svg className={styles.externalIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </button>
          </div>
        </section>

        <section className={styles.cardsColumn}>
          <article className={styles.sessionCard}>
            <header className={styles.sessionCardHeader}>
              <svg className={styles.sessionCardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
              </svg>
              <h2 className={styles.sessionCardTitle}>Session Status</h2>
            </header>

            {hasActiveSession ? (
              <div className={styles.sessionCardBody}>
                <dl className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <dt>Tutor</dt>
                    <dd>{PLACEHOLDER_SESSION.tutorName}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Topic</dt>
                    <dd>{PLACEHOLDER_SESSION.topic}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Duration</dt>
                    <dd>{PLACEHOLDER_SESSION.duration}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Date &amp; Time</dt>
                    <dd>{PLACEHOLDER_SESSION.dateTime}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Status</dt>
                    <dd>{PLACEHOLDER_SESSION.status}</dd>
                  </div>
                </dl>
                <button type="button" className={styles.btnPrimaryStudent}>
                  Chat Tutor
                </button>
              </div>
            ) : (
              <div className={styles.sessionCardEmpty}>
                <p className={styles.emptyStatus}>
                  Current Status: <strong>No Active Sessions</strong>
                </p>
                <div className={styles.emptyIllustration} aria-hidden>
                  <svg viewBox="0 0 120 80" className={styles.deskSvg}>
                    <rect x="10" y="50" width="100" height="4" fill="#cbd5e1" />
                    <rect x="30" y="30" width="40" height="25" fill="none" stroke="#94a3b8" strokeWidth="2" />
                    <circle cx="85" cy="25" r="8" fill="none" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="85" y1="33" x2="85" y2="50" stroke="#94a3b8" strokeWidth="2" />
                  </svg>
                </div>
                <p className={styles.emptyCaption}>Your desk is ready when you are.</p>
              </div>
            )}
          </article>

          <div className={styles.bottomCards}>
            <article className={styles.smallCard}>
              <svg className={styles.smallCardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <circle cx="11" cy="11" r="8" strokeWidth={2} />
                <path d="M21 21l-4.35-4.35" strokeWidth={2} strokeLinecap="round" />
              </svg>
              <h3 className={styles.smallCardTitle}>Active Matches</h3>
              <p className={styles.smallCardText}>
                Scanning for available tutors for your [Subject]... ✨
              </p>
            </article>

            <article className={styles.smallCard}>
              <svg className={styles.smallCardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" strokeWidth={2} />
              </svg>
              <h3 className={styles.smallCardTitle}>Recent Session History</h3>
              <ul className={styles.historyList}>
                {PLACEHOLDER_HISTORY.map((item) => (
                  <li key={item} className={styles.historyItem}>
                    <span className={styles.historyAvatar} aria-hidden />
                    <span>{item}</span>
                    <span className={styles.historyCheck} aria-hidden>✓</span>
                  </li>
                ))}
              </ul>
              <button type="button" className={styles.viewAllBtn}>
                View all
              </button>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

type TutorDashboardProps = {
  userName?: string;
};

function TutorDashboard({ userName = 'Tutor' }: TutorDashboardProps) {
  return (
    <div className={styles.page}>
      <DashboardNav role="tutor" activePath="/dashboard/tutor" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Hi, {userName}! Ready to solve your students&apos; worries?
          </h1>
          <p className={styles.heroSubtitle}>
            Find a peer or tutor for your specific topic in seconds.
          </p>
          <button type="button" className={styles.btnPrimaryTutor}>
            Request a Tutor now
          </button>
        </section>

        <section className={styles.cardsColumn}>
          <article className={styles.plainCard}>
            <h2 className={styles.plainCardTitle}>Your Next Session</h2>
            <dl className={styles.detailList}>
              <div className={styles.detailRow}>
                <dt>Student</dt>
                <dd>{PLACEHOLDER_SESSION.studentName}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Topic</dt>
                <dd>{PLACEHOLDER_SESSION.topic}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Duration</dt>
                <dd>{PLACEHOLDER_SESSION.duration}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Date &amp; Time</dt>
                <dd>{PLACEHOLDER_SESSION.dateTime}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Status</dt>
                <dd>{PLACEHOLDER_SESSION.status}</dd>
              </div>
            </dl>
            <button type="button" className={styles.btnPrimaryTutor}>
              Join Meeting
            </button>
          </article>

          <div className={styles.bottomCards}>
            <article className={styles.plainCard}>
              <h3 className={styles.plainCardTitle}>Availability Status</h3>
              <p className={styles.availableStatus}>
                <span className={styles.availableDot} aria-hidden />
                Available
              </p>
            </article>

            <article className={styles.plainCard}>
              <h3 className={styles.plainCardTitle}>Recent Session History</h3>
              <div className={styles.historyPlaceholder} aria-hidden>
                <svg viewBox="0 0 48 48" className={styles.noteIcon}>
                  <rect x="8" y="6" width="28" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M36 14l8 8v24a2 2 0 01-2 2h-6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Student dashboard — toggle `hasActiveSession` to preview both mockup states */
export function StudentDashboardPage() {
  const hasActiveSession =
    new URLSearchParams(window.location.search).get('session') === 'active';

  return <StudentDashboard hasActiveSession={hasActiveSession} />;
}

export function TutorDashboardPage() {
  return <TutorDashboard />;
}
