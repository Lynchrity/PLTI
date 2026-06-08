import { APP_TIMEZONE, localDateInputValue } from './timezone';

export function buildSessionTimes(
  date: string,
  time: string,
  durationMinutes: number,
): { sessionStart: string; sessionEnd: string } {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  // Interpret booking input as WIB wall-clock time
  const start = new Date(`${date}T${normalizedTime}+07:00`);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Please enter a valid date and time.');
  }

  if (start.getTime() <= Date.now()) {
    throw new Error('Session must be scheduled in the future.');
  }

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);

  return {
    sessionStart: start.toISOString(),
    sessionEnd: end.toISOString(),
  };
}

export function defaultBookingDate(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return localDateInputValue(tomorrow);
}

export function defaultBookingTime(): string {
  return '13:00';
}

export { APP_TIMEZONE };
