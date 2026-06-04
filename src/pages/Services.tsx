import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import {
  createService,
  deleteService,
  getMyServices,
} from '../services/serviceManagementService';
import type { Service } from '../types';
import shared from '../styles/shared.module.css';

const emptyForm = {
  type: 'tutoring',
  title: '',
  subject: '',
  topic: '',
  duration_minutes: 30,
  price: 25,
};

export function Services() {
  const { profile } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile) return;
    const data = await getMyServices(profile.user_id);
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load services.'),
    );
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    try {
      const isPeer = form.type === 'peer';
      await createService(profile.user_id, {
        type: form.type,
        title: form.title,
        subject: form.subject,
        topic: form.topic,
        duration_minutes: form.duration_minutes,
        price: isPeer ? 0 : form.price,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service.');
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!profile) return;
    await deleteService(serviceId, profile.user_id);
    await load();
  };

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>My Services</h1>
      <p className={shared.pageSubtitle}>
        Create tutoring or free peer services. Each service defines its own subject, topic, price,
        and duration.
      </p>

      {error && <div className={shared.error}>{error}</div>}

      <form
        onSubmit={handleCreate}
        className={shared.card}
        style={{ padding: 24, marginBottom: 32, maxWidth: 640 }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>New service</h2>
        <div className={shared.formGroup}>
          <label className={shared.label}>Type</label>
          <select
            className={shared.select}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="tutoring">Tutoring (paid)</option>
            <option value="peer">Peer (free)</option>
          </select>
        </div>
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
          <input
            className={shared.input}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            required
          />
        </div>
        <div className={shared.formGroup}>
          <label className={shared.label}>Topic / grade hint</label>
          <input
            className={shared.input}
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. High School, Vectors"
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
        {form.type !== 'peer' && (
          <div className={shared.formGroup}>
            <label className={shared.label}>Price (USD)</label>
            <input
              type="number"
              className={shared.input}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
              min={0}
            />
          </div>
        )}
        <button type="submit" className={shared.btnPrimary}>
          Create Service
        </button>
      </form>

      {loading ? (
        <p>Loading services…</p>
      ) : services.length === 0 ? (
        <p className={shared.empty}>No services yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map((s) => (
            <li
              key={s.service_id}
              className={shared.card}
              style={{
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{s.title}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-muted)' }}>
                  {s.subject} · {s.topic} · {s.duration_minutes} min ·{' '}
                  {s.price === 0 ? 'Free' : `$${s.price}`}
                </p>
              </div>
              <button
                type="button"
                className={shared.btnOutline}
                onClick={() => handleDelete(s.service_id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
