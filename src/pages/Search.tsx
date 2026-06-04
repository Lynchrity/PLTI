import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { ServiceCard } from '../components/ServiceCard/ServiceCard';
import {
  DURATION_OPTIONS,
  GRADE_LEVEL_OPTIONS,
  RATING_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
} from '../constants/filters';
import { useApp } from '../context/AppContext';
import { searchServices } from '../services/marketplaceService';
import { bookService } from '../services/scheduleService';
import type { SearchFilters, ServiceWithTutor } from '../types';
import shared from '../styles/shared.module.css';
import styles from './Search.module.css';

const defaultFilters: SearchFilters = {
  query: '',
  subject: 'All subjects',
  gradeLevel: 'All grades',
  minRating: 0,
  maxPrice: null,
  minPrice: null,
  duration: null,
  type: '',
};

export function Search() {
  const { profile } = useApp();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...defaultFilters,
    type: searchParams.get('type') ?? '',
    query: searchParams.get('q') ?? '',
  }));
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [results, setResults] = useState<ServiceWithTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<ServiceWithTutor | null>(null);
  const [bookMessage, setBookMessage] = useState('');

  const activeFilters = useMemo(
    () => ({
      ...filters,
      maxPrice: maxPriceInput ? Number(maxPriceInput) : null,
    }),
    [filters, maxPriceInput],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const data = await searchServices(activeFilters);
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(run, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeFilters]);

  const handleBook = async (service: ServiceWithTutor) => {
    if (!profile) return;
    setBooking(service);
    setBookMessage('');

    const isFree = service.type.toLowerCase() === 'peer' || service.price === 0;
    const amount = isFree ? 0 : Number(service.price ?? 0);
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(13, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (service.duration_minutes ?? 30));

    try {
      const schedule = await bookService({
        serviceId: service.service_id,
        initiatorId: profile.user_id,
        participantId: service.creator_id,
        sessionStart: start.toISOString(),
        sessionEnd: end.toISOString(),
        totalAmount: amount,
      });
      setBookMessage(
        isFree
          ? `Peer session booked (free)! Schedule ID: ${schedule.schedule_id}`
          : `Session booked (mock payment). Schedule ID: ${schedule.schedule_id}`,
      );
    } catch (err) {
      setBookMessage(err instanceof Error ? err.message : 'Booking failed.');
    }
  };

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Search</h1>
      <p className={shared.pageSubtitle}>
        Find tutoring services or free peer study buddies. Apply multiple filters at once.
      </p>

      <div className={styles.filters}>
        <input
          type="search"
          className={`${shared.input} ${styles.searchBar}`}
          placeholder="Search by title, subject, topic, or tutor…"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
        />
        <select
          className={`${shared.select} ${styles.filterSelect}`}
          value={filters.subject}
          onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
        >
          {SUBJECT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={`${shared.select} ${styles.filterSelect}`}
          value={filters.gradeLevel}
          onChange={(e) => setFilters((f) => ({ ...f, gradeLevel: e.target.value }))}
        >
          {GRADE_LEVEL_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className={`${shared.select} ${styles.filterSelect}`}
          value={String(filters.minRating)}
          onChange={(e) =>
            setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))
          }
        >
          {RATING_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          className={`${shared.input} ${styles.filterSelect}`}
          placeholder="Max price"
          value={maxPriceInput}
          onChange={(e) => setMaxPriceInput(e.target.value)}
          min={0}
        />
        <select
          className={`${shared.select} ${styles.filterSelect}`}
          value={filters.duration ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              duration: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          className={`${shared.select} ${styles.filterSelect}`}
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          {SERVICE_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className={shared.error}>{error}</div>}

      <p className={styles.resultsCount}>
        {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
      </p>

      {!loading && results.length === 0 && (
        <p className={shared.empty}>No services match your filters.</p>
      )}

      <div className={styles.grid}>
        {results.map((service) => (
          <ServiceCard
            key={service.service_id}
            service={service}
            onBook={handleBook}
            showChat
          />
        ))}
      </div>

      {booking && bookMessage && (
        <div className={styles.bookingPanel}>
          <p>
            <strong>{booking.title}</strong>: {bookMessage}
          </p>
        </div>
      )}
    </AppLayout>
  );
}
