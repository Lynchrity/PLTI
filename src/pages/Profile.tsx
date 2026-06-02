import { useState } from 'react';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import shared from '../styles/shared.module.css';

export function Profile() {
  const { profile, profileExtras, updateProfileExtras, role } = useApp();
  const [goodAt, setGoodAt] = useState(profileExtras.subjects_good_at);
  const [needHelp, setNeedHelp] = useState(profileExtras.subjects_need_help);
  const [name, setName] = useState(profile?.name ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    setMessage('');

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ name })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      updateProfileExtras({
        subjects_good_at: goodAt,
        subjects_need_help: needHelp,
      });

      setMessage('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Profile</h1>
      <p className={shared.pageSubtitle}>
        Manage your account. Subject preferences are stored locally for this demo.
      </p>

      {error && <div className={shared.error}>{error}</div>}
      {message && (
        <p style={{ color: '#16a34a', marginBottom: 16 }}>{message}</p>
      )}

      <form onSubmit={handleSave} className={shared.card} style={{ padding: 24, maxWidth: 560 }}>
        <div className={shared.formGroup}>
          <label className={shared.label}>Name</label>
          <input
            className={shared.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Email</label>
          <input className={shared.input} value={profile?.email ?? ''} disabled />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Role</label>
          <input
            className={shared.input}
            value={role === 'tutor' ? 'Tutor' : 'Student'}
            disabled
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Subjects / topics I&apos;m good at</label>
          <textarea
            className={shared.textarea}
            value={goodAt}
            onChange={(e) => setGoodAt(e.target.value)}
            placeholder="e.g. Calculus, Essay writing"
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Subjects / topics I need help with</label>
          <textarea
            className={shared.textarea}
            value={needHelp}
            onChange={(e) => setNeedHelp(e.target.value)}
            placeholder="e.g. Organic chemistry, Public speaking"
          />
        </div>
        <button type="submit" className={shared.btnPrimary}>
          Save Profile
        </button>
        {role === 'student' && (
          <p style={{ marginTop: 16 }}>
            <a href="/wallet" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Open mock wallet →
            </a>
          </p>
        )}
      </form>
    </AppLayout>
  );
}
