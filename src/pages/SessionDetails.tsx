import { useCallback, useEffect, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router-dom';

import { AppLayout } from '../components/AppLayout/AppLayout';

import { SessionDetailCard } from '../components/SessionDetailCard/SessionDetailCard';

import { useApp } from '../context/AppContext';

import {

  formatAttendanceOutcome,

  formatScheduleStatus,

  isInAttendanceWindow,

  isOngoingSession,

  submitStudentAttendance,

  submitTutorAttendance,

} from '../services/attendanceService';

import { createOrGetChatRoom } from '../services/chatService';

import {

  cancelScheduleRequest,

  getScheduleWithParties,

  processAllScheduleUpdates,

} from '../services/scheduleService';

import type { ScheduleWithDetails } from '../types';

import { APP_TIMEZONE_LABEL, formatSessionDateTime } from '../utils/timezone';

import { getErrorMessage } from '../utils/errors';

import shared from '../styles/shared.module.css';



export function SessionDetails() {

  const { scheduleId } = useParams<{ scheduleId: string }>();

  const { profile, refreshProfile } = useApp();

  const navigate = useNavigate();

  const [schedule, setSchedule] = useState<ScheduleWithDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [message, setMessage] = useState('');

  const [cancelling, setCancelling] = useState(false);

  const [submittingAttendance, setSubmittingAttendance] = useState(false);



  const load = useCallback(async () => {

    if (!scheduleId || !profile) return;

    await processAllScheduleUpdates(profile.user_id);

    const data = await getScheduleWithParties(scheduleId, profile.user_id);

    setSchedule(data);

  }, [scheduleId, profile]);



  useEffect(() => {

    if (!scheduleId || !profile) return;



    load()

      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load session.'))

      .finally(() => setLoading(false));

  }, [scheduleId, profile, load]);



  useEffect(() => {

    if (!schedule || !profile || !isOngoingSession(schedule)) return;



    const timer = window.setInterval(() => {

      load().catch(() => undefined);

    }, 30_000);



    return () => window.clearInterval(timer);

  }, [schedule, profile, load]);



  const openChat = async () => {

    if (!profile || !schedule) return;

    const otherId =

      schedule.initiator_id === profile.user_id

        ? schedule.participant_id

        : schedule.initiator_id;

    const roomId = await createOrGetChatRoom(profile.user_id, otherId);

    navigate(`/chat?room=${roomId}`);

  };



  const handleCancel = async () => {

    if (!scheduleId || !window.confirm('Cancel this request? Paid sessions will be refunded.')) {

      return;

    }



    setCancelling(true);

    setError('');

    setMessage('');

    try {

      await cancelScheduleRequest(scheduleId);

      await refreshProfile();

      setMessage('Request cancelled. Any payment has been refunded to your wallet.');

      await load();

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to cancel request.'));

    } finally {

      setCancelling(false);

    }

  };



  const handleConfirmAttendance = async () => {
    if (!scheduleId || !schedule || !profile) return;

    setSubmittingAttendance(true);
    setError('');
    setMessage('');
    try {
      const isStudent = schedule.initiator_id === profile.user_id;
      if (isStudent) {
        await submitStudentAttendance(scheduleId, true);
      } else {
        await submitTutorAttendance(scheduleId, true);
      }
      await refreshProfile();
      setMessage('Attendance recorded.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to record attendance.'));
    } finally {
      setSubmittingAttendance(false);
    }
  };



  const isStudentPending =

    schedule &&

    profile &&

    schedule.initiator_id === profile.user_id &&

    schedule.status === 'scheduled' &&

    !schedule.participant_confirmed;



  const isStudent = profile && schedule && schedule.initiator_id === profile.user_id;

  const showAttendance =

    schedule &&

    profile &&

    isOngoingSession(schedule) &&

    (isInAttendanceWindow(schedule) || schedule.attendance_resolved === false);



  const studentAnswered = schedule?.student_reports_tutor_present != null;

  const tutorAnswered = schedule?.tutor_reports_student_present != null;

  const canAnswer =

    showAttendance &&

    !schedule?.attendance_resolved &&

    isInAttendanceWindow(schedule) &&

    ((isStudent && !studentAnswered) || (!isStudent && !tutorAnswered));



  const bookingStatus = schedule

    ? `Student ${schedule.initiator_confirmed ? '✓' : '—'}, Tutor accepted ${schedule.participant_confirmed ? '✓' : '—'}`

    : '—';



  return (

    <AppLayout>

      <div className={shared.pageContent}>

        <Link

          to="/dashboard"

          style={{ color: 'var(--color-primary)', marginBottom: 16, display: 'inline-block' }}

        >

          ← Back

        </Link>

        <h1 className={shared.pageTitle}>Session Details</h1>

        <p className={shared.pageSubtitle}>

          All times are shown in {APP_TIMEZONE_LABEL} (Western Indonesian Time, UTC+7).

        </p>



        {error && <div className={shared.error}>{error}</div>}

        {message && <p style={{ color: '#16a34a', marginBottom: 16 }}>{message}</p>}



        {loading ? (

          <p>Loading…</p>

        ) : !schedule ? (

          <p className={shared.empty}>Session not found.</p>

        ) : (

          <div className={shared.centeredNarrow}>

            <SessionDetailCard

              title={schedule.service_title ?? 'Session'}

              rows={[

                { label: 'Service', value: schedule.service_title },

                {

                  label: 'Subject',

                  value: `${schedule.subject ?? '—'} · ${schedule.topic ?? '—'}`,

                },

                { label: 'Student', value: schedule.student_name },

                { label: 'Tutor', value: schedule.tutor_name },

                { label: 'Start', value: formatSessionDateTime(schedule.session_start) },

                { label: 'End', value: formatSessionDateTime(schedule.session_end) },

                { label: 'Duration', value: `${schedule.duration_minutes ?? '—'} minutes` },

                {

                  label: 'Status',

                  value: formatScheduleStatus(schedule.status, schedule),

                },

                { label: 'Booking', value: bookingStatus },

                ...(schedule.attendance_resolved

                  ? [

                      {

                        label: 'Attendance result',

                        value: formatAttendanceOutcome(schedule.attendance_outcome),

                      },

                    ]

                  : []),

              ]}

              actions={

                <>

                  {canAnswer && (
                    <div style={{ width: '100%', marginBottom: 12 }}>
                      <p style={{ margin: '0 0 12px', fontWeight: 600 }}>
                        {isStudent ? 'Is the tutor present?' : 'Is the student present?'}
                      </p>
                      <button
                        type="button"
                        className={shared.btnPrimary}
                        disabled={submittingAttendance}
                        onClick={handleConfirmAttendance}
                      >
                        Yes
                      </button>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 12 }}>
                        If you do not confirm within 15 minutes of the session start, it will
                        automatically be recorded as the other party not being present.
                      </p>
                    </div>
                  )}

                  {showAttendance && !canAnswer && !schedule.attendance_resolved && (

                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>

                      {studentAnswered && tutorAnswered

                        ? 'Waiting for attendance to be finalized…'

                        : 'Waiting for the other party to confirm attendance…'}

                    </p>

                  )}

                  <button type="button" className={shared.btnPrimary} onClick={openChat}>

                    Open Chat

                  </button>

                  {isStudentPending && (

                    <button

                      type="button"

                      className={shared.btnOutline}

                      onClick={handleCancel}

                      disabled={cancelling}

                    >

                      {cancelling ? 'Cancelling…' : 'Cancel request'}

                    </button>

                  )}

                  <Link to="/history" className={shared.btnOutline}>

                    History

                  </Link>

                </>

              }

            />

          </div>

        )}

      </div>

    </AppLayout>

  );

}


