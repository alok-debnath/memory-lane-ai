import { formatInTimeZone } from 'date-fns-tz';
import { toZonedTime } from 'date-fns-tz';
import { isSameDay, addDays, startOfWeek, endOfWeek, isAfter, isBefore } from 'date-fns';

export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function formatInTz(date: Date | string, timezone: string, formatStr: string): string {
  try {
    return formatInTimeZone(new Date(date), timezone, formatStr);
  } catch {
    return formatInTimeZone(new Date(date), 'UTC', formatStr);
  }
}

export function nowInTz(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

export function dateInTz(date: Date | string, timezone: string): Date {
  return toZonedTime(new Date(date), timezone);
}

export function isTodayInTz(date: Date | string, timezone: string): boolean {
  return isSameDay(dateInTz(date, timezone), nowInTz(timezone));
}

export function isTomorrowInTz(date: Date | string, timezone: string): boolean {
  return isSameDay(dateInTz(date, timezone), addDays(nowInTz(timezone), 1));
}

export function isThisWeekInTz(date: Date | string, timezone: string): boolean {
  const d = dateInTz(date, timezone);
  const now = nowInTz(timezone);
  return !isBefore(d, startOfWeek(now)) && !isAfter(d, endOfWeek(now));
}

export function isPastInTz(date: Date | string, timezone: string): boolean {
  return isBefore(dateInTz(date, timezone), nowInTz(timezone));
}

export function isAfterNowInTz(date: Date | string, timezone: string): boolean {
  return isAfter(dateInTz(date, timezone), nowInTz(timezone));
}

/** All IANA timezones available in the browser */
export function getAllTimezones(): string[] {
  try {
    return (Intl as any).supportedValuesOf('timeZone');
  } catch {
    // Fallback for older browsers
    return [
      'UTC',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
      'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Mexico_City',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
      'Europe/Istanbul', 'Europe/Rome', 'Europe/Madrid', 'Europe/Amsterdam',
      'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
      'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Hong_Kong',
      'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
      'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
    ];
  }
}

/** Format timezone for display: "America/New_York" → "America/New York (EST, UTC-5)" */
export function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const short = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(now)
      .find(p => p.type === 'timeZoneName')?.value || '';
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(now)
      .find(p => p.type === 'timeZoneName')?.value || '';
    const displayName = tz.replace(/_/g, ' ');
    return `${displayName} (${short}, ${offset})`;
  } catch {
    return tz;
  }
}
