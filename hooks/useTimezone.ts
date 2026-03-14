import * as Localization from 'expo-localization';
import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

export function useTimezone() {
  const { timezone, setTimezone } = useAuthStore();

  useEffect(() => {
    // Automatically capture device timezone
    const tz = Localization.getCalendars()[0]?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setTimezone(tz);
  }, []);

  const formatTz = (dateString: string | Date, fmt: string) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return formatInTimeZone(date, timezone, fmt);
    } catch {
      return '';
    }
  };

  return { timezone, setTimezone, formatTz };
}
