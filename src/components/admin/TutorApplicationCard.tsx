import { useState } from 'react';
import {
  getResumeSignedUrl,
  type TutorApplicationWithUser,
} from '../../services/tutorApplicationService';
import shared from '../../styles/shared.module.css';
import styles from './TutorApplicationCard.module.css';

interface TutorApplicationCardProps {
  app: TutorApplicationWithUser;
  showActions?: boolean;
  onApprove?: (applicationId: string) => void;
  onReject?: (applicationId: string) => void;
}

export function TutorApplicationCard({
  app,
  showActions = false,
  onApprove,
  onReject,
}: TutorApplicationCardProps) {
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');

  const handleViewResume = async () => {
    if (!app.resume_file_path) return;
    setResumeError('');
    setResumeLoading(true);
    try {
      const url = await getResumeSignedUrl(app.resume_file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Could not open resume.');
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <li className={`${shared.card} ${styles.card}`}>
      <div className={styles.body}>
        <div className={styles.info}>
          <strong>{app.applicant_name}</strong>
          <span className={styles.email}>{app.applicant_email}</span>
          <p className={styles.meta}>
            Status: <strong>{app.status}</strong>
            {app.submitted_at && (
              <> · Submitted {new Date(app.submitted_at).toLocaleString()}</>
            )}
            {app.reviewed_at && (
              <> · Reviewed {new Date(app.reviewed_at).toLocaleString()}</>
            )}
          </p>
          {app.resume_file_path && (
            <p className={styles.meta}>
              Resume:{' '}
              <button
                type="button"
                className={styles.resumeLink}
                onClick={handleViewResume}
                disabled={resumeLoading}
              >
                {resumeLoading ? 'Opening…' : 'View resume'}
              </button>
            </p>
          )}
          {resumeError && <p className={styles.resumeError}>{resumeError}</p>}
          {app.linkedin_url && (
            <p className={styles.meta}>
              LinkedIn:{' '}
              <a href={app.linkedin_url} target="_blank" rel="noreferrer">
                {app.linkedin_url}
              </a>
            </p>
          )}
          {app.experience_summary && (
            <p className={styles.summary}>{app.experience_summary}</p>
          )}
        </div>
        {showActions && app.status === 'pending' && onApprove && onReject && (
          <div className={styles.actions}>
            <button
              type="button"
              className={shared.btnPrimary}
              onClick={() => onApprove(app.application_id)}
            >
              Approve
            </button>
            <button
              type="button"
              className={shared.btnOutline}
              onClick={() => onReject(app.application_id)}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
