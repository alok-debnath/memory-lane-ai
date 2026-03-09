import { useAuth } from '@/contexts/AuthContext';
import { formatInTz } from '@/lib/timezone';
import { useCallback } from 'react';

export function useTimezone() {
  const { timezone } = useAuth();

  const formatTz = useCallback(
    (date: Date | string, fmt: string) => formatInTz(date, timezone, fmt),
    [timezone]
  );

  return { timezone, formatTz };
}
