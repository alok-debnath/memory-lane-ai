import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  timezone: string;
  setUserId: (userId: string | null) => void;
  setTimezone: (timezone: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  setUserId: (userId) => set({ userId }),
  setTimezone: (timezone) => set({ timezone }),
}));
