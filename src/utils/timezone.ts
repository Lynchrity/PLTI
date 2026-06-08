/** All session times are stored as UTC and displayed in WIB (Western Indonesian Time, UTC+7). */
export const APP_TIMEZONE = 'Asia/Jakarta';
export const APP_TIMEZONE_LABEL = 'WIB';

/**
 * Supabase/Postgres often returns timestamptz without a Z suffix. Treat those as UTC
 * so WIB conversion is correct (e.g. 05:09 WIB on 9 Jun, not 22:09 WIB on 8 Jun).
 */
export function parseAppTimestamp(iso: string | null | undefined): Date | null {
  if (!iso) return null;

  const trimmed = iso.trim();
  if (!trimmed) return null;

  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const date = new Date(`${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const sessionFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: APP_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const sessionTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatSessionDateTime(iso: string | null | undefined): string {
  const date = parseAppTimestamp(iso);
  if (!date) return '—';
  return `${sessionFormatter.format(date)} ${APP_TIMEZONE_LABEL}`;
}

export function formatSessionTime(iso: string | null | undefined): string {
  const date = parseAppTimestamp(iso);
  if (!date) return '—';
  return `${sessionTimeFormatter.format(date)} ${APP_TIMEZONE_LABEL}`;
}

export function formatSessionRange(startIso: string, endIso: string): string {
  const start = parseAppTimestamp(startIso);
  const end = parseAppTimestamp(endIso);
  if (!start || !end) return '—';
  return `${sessionFormatter.format(start)} – ${sessionTimeFormatter.format(end)} ${APP_TIMEZONE_LABEL}`;
}

export function localDateInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}
