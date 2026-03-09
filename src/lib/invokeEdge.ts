import { supabase } from '@/integrations/supabase/client';
import { getDetectedTimezone } from '@/lib/timezone';

let _timezone = getDetectedTimezone();

/** Call once after login to set the user's configured timezone */
export function setEdgeTimezone(tz: string) {
  _timezone = tz;
}

/** Wrapper around supabase.functions.invoke that auto-injects timezone header */
export function invokeEdge<T = any>(
  fnName: string,
  body: Record<string, any>,
  options?: { headers?: Record<string, string> },
) {
  return supabase.functions.invoke<T>(fnName, {
    body,
    headers: {
      'x-user-timezone': _timezone,
      ...options?.headers,
    },
  });
}
