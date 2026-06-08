import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { deleteMediaByPublicUrl, uploadMediaFile } from '../services/storageService';
import { supabase } from '../services/supabase';
import { GRADE_SELECT_OPTIONS } from '../constants/filters';
import { getErrorMessage } from '../utils/errors';
import { isMissingColumnError } from '../utils/supabaseSchema';
import shared from '../styles/shared.module.css';

export function Profile() {
  const { profile, profileExtras, updateProfileExtras, role, refreshProfile } = useApp();
  const [gradeLevel, setGradeLevel] = useState(profileExtras.grade_level);
  const [name, setName] = useState(profile?.name ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    setMessage('');

    try {
      let { error: updateError } = await supabase
        .from('users')
        .update({ name, grade_level: gradeLevel || null })
        .eq('user_id', profile.user_id);

      if (updateError && isMissingColumnError(updateError)) {
        ({ error: updateError } = await supabase
          .from('users')
          .update({ name })
          .eq('user_id', profile.user_id));
      }

      if (updateError) throw updateError;

      updateProfileExtras({ grade_level: gradeLevel });
      await refreshProfile();
      setMessage('Profile saved.');
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed.'));
    }
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    setError('');
    try {
      const url = await uploadMediaFile('avatars', profile.user_id, file);
      let { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: url })
        .eq('user_id', profile.user_id);

      if (updateError && isMissingColumnError(updateError)) {
        throw new Error(
          'Profile pictures need a database update. Run supabase-schema-updates.sql in Supabase first.',
        );
      }

      if (updateError) throw updateError;
      await refreshProfile();
      setMessage('Profile picture updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemovePicture = async () => {
    if (!profile?.profile_picture_url) return;
    if (!window.confirm('Remove your profile picture?')) return;

    setRemoving(true);
    setError('');
    setMessage('');
    try {
      const previousUrl = profile.profile_picture_url;

      let { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: null })
        .eq('user_id', profile.user_id);

      if (updateError && isMissingColumnError(updateError)) {
        throw new Error(
          'Profile pictures need a database update. Run supabase-schema-updates.sql in Supabase first.',
        );
      }

      if (updateError) throw updateError;

      await deleteMediaByPublicUrl(previousUrl);
      await refreshProfile();
      setMessage('Profile picture removed.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove profile picture.'));
    } finally {
      setRemoving(false);
    }
  };

  const pictureBusy = uploading || removing;

  return (
    <AppLayout>
      <div className={shared.pageContent}>
        <h1 className={shared.pageTitle}>Profile</h1>
        <p className={shared.pageSubtitle}>
          Manage your account and profile picture. Subjects are set on your services, not here.
        </p>

        {error && <div className={shared.error}>{error}</div>}
        {message && (
          <p style={{ color: '#16a34a', marginBottom: 16 }}>{message}</p>
        )}

        <form onSubmit={handleSave} className={`${shared.card} ${shared.centeredForm}`}>
          <div className={shared.formGroup}>
            <label className={shared.label}>Profile picture</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--color-primary)',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--color-primary-light)',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}
              >
                {profile?.profile_picture_url ? (
                  <img
                    src={profile.profile_picture_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  profile?.name?.charAt(0)?.toUpperCase()
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePictureChange}
                  hidden
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className={shared.btnOutline}
                    onClick={() => fileRef.current?.click()}
                    disabled={pictureBusy}
                  >
                    {uploading ? 'Uploading…' : 'Upload photo'}
                  </button>
                  {profile?.profile_picture_url && (
                    <button
                      type="button"
                      className={shared.btnOutline}
                      onClick={handleRemovePicture}
                      disabled={pictureBusy}
                    >
                      {removing ? 'Removing…' : 'Remove photo'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

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
            <label className={shared.label}>Grade level</label>
            <select
              className={shared.select}
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            >
              <option value="">Select grade</option>
              {GRADE_SELECT_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={shared.btnPrimary}>
            Save Profile
          </button>
          {role === 'student' && (
            <p style={{ marginTop: 16 }}>
              <Link to="/wallet" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Open wallet →
              </Link>
            </p>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
