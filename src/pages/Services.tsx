import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import { GRADE_SELECT_OPTIONS, SUBJECT_SELECT_OPTIONS } from '../constants/filters';
import {
  createService,
  deleteService,
  getMyServices,
} from '../services/serviceManagementService';
import { uploadMediaFile } from '../services/storageService';
import type { Service } from '../types';
import { formatIdrInputValue, formatPriceIdrPlain, parseIdrInput, serviceTypeForRole } from '../utils/currency';
import { getErrorMessage } from '../utils/errors';
import shared from '../styles/shared.module.css';

const tutorEmptyForm = {
  title: '',
  subject: SUBJECT_SELECT_OPTIONS[0],
  topic: '',
  description: '',
  grade_level: GRADE_SELECT_OPTIONS[0],
  duration_minutes: 60,
  price: 45000,
  priceInput: '45.000,00',
};

const peerEmptyForm = {
  title: '',
  subject: SUBJECT_SELECT_OPTIONS[0],
  topic: '',
  description: '',
  grade_level: GRADE_SELECT_OPTIONS[0],
  duration_minutes: 30,
};

export function Services() {
  const { profile, role } = useApp();

  return (
    <AppLayout>
      <ManageServices profileId={profile?.user_id} role={role === 'tutor' ? 'tutor' : 'student'} />
    </AppLayout>
  );
}

function ManageServices({
  profileId,
  role,
}: {
  profileId?: string;
  role: 'student' | 'tutor';
}) {
  const isPeer = role === 'student';
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(isPeer ? peerEmptyForm : tutorEmptyForm);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!profileId) return;
    const data = await getMyServices(profileId);
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load().catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load services.'),
    );
  }, [profileId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    setError('');
    setSubmitting(true);
    try {
      let bannerUrl: string | null = null;
      if (bannerFile) {
        bannerUrl = await uploadMediaFile(
          'banners',
          profileId,
          bannerFile,
          `service-${Date.now()}.jpg`,
        );
      }

      await createService(profileId, {
        type: serviceTypeForRole(role),
        title: form.title,
        subject: form.subject,
        topic: form.topic,
        description: form.description,
        grade_level: form.grade_level,
        banner_url: bannerUrl,
        duration_minutes: form.duration_minutes,
        price: isPeer ? 0 : parseIdrInput((form as typeof tutorEmptyForm).priceInput),
      });
      setForm(isPeer ? peerEmptyForm : tutorEmptyForm);
      setBannerFile(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create service.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!profileId) return;
    if (!window.confirm('Delete this service?')) return;

    setError('');
    try {
      await deleteService(serviceId, profileId);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete service.'));
    }
  };

  return (
    <div className={shared.pageContent}>
      <h1 className={shared.pageTitle}>{isPeer ? 'My Peer Services' : 'My Tutoring Services'}</h1>
      <p className={shared.pageSubtitle}>
        {isPeer
          ? 'Offer free peer study sessions. Other students can find and book you from Search.'
          : 'Create paid tutoring offerings. Enter your rate in rupiah before the 15% platform fee (students see base + fee on Search).'}
      </p>

      {error && <div className={shared.error}>{error}</div>}

      <form
        onSubmit={handleCreate}
        className={`${shared.card} ${shared.centeredForm}`}
        style={{ marginBottom: 32 }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
          {isPeer ? 'New peer service' : 'New tutoring service'}
        </h2>
        <div className={shared.formGroup}>
          <label className={shared.label}>Title</label>
          <input
            className={shared.input}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Subject</label>
          <select
            className={shared.select}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            required
          >
            {SUBJECT_SELECT_OPTIONS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Grade level</label>
          <select
            className={shared.select}
            value={form.grade_level}
            onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))}
            required
          >
            {GRADE_SELECT_OPTIONS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Topic</label>
          <input
            className={shared.input}
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. Vectors, Essay writing"
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Description</label>
          <textarea
            className={shared.textarea}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Describe what you offer in this session"
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Banner image (optional)</label>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
            className={shared.input}
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Duration (minutes)</label>
          <input
            type="number"
            className={shared.input}
            value={form.duration_minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))
            }
            min={15}
          />
        </div>
        {!isPeer && (
          <div className={shared.formGroup}>
            <label className={shared.label}>Price (rupiah)</label>
            <input
              type="text"
              className={shared.input}
              value={(form as typeof tutorEmptyForm).priceInput}
              onChange={(e) =>
                setForm((f) => ({ ...f, priceInput: e.target.value }))
              }
              onBlur={() =>
                setForm((f) => {
                  const tutorForm = f as typeof tutorEmptyForm;
                  const amount = parseIdrInput(tutorForm.priceInput);
                  return {
                    ...tutorForm,
                    price: amount,
                    priceInput: formatIdrInputValue(amount),
                  };
                })
              }
              placeholder="45.000,00"
              required
            />
          </div>
        )}
        <button type="submit" className={shared.btnPrimary} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create service'}
        </button>
      </form>

      {loading ? (
        <p>Loading services…</p>
      ) : services.length === 0 ? (
        <p className={shared.empty}>No services yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map((s) => (
            <li key={s.service_id} className={shared.detailCard}>
              {s.banner_url && (
                <img
                  src={s.banner_url}
                  alt=""
                  style={{ width: '100%', height: 120, objectFit: 'cover' }}
                />
              )}
              <div className={shared.detailCardBody}>
                <p className={shared.detailRow}>
                  <strong>Title</strong>
                  {s.title}
                </p>
                <p className={shared.detailRow}>
                  <strong>Subject</strong>
                  {s.subject} · {s.grade_level ?? s.topic}
                </p>
                {s.description && (
                  <p className={shared.detailRow}>
                    <strong>Description</strong>
                    {s.description}
                  </p>
                )}
                <p className={shared.detailRow}>
                  <strong>Price</strong>
                  {formatPriceIdrPlain(s.price, s.type)} · {s.duration_minutes} min
                </p>
                <button
                  type="button"
                  className={shared.btnOutline}
                  onClick={() => handleDelete(s.service_id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
