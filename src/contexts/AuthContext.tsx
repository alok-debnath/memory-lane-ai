import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getDetectedTimezone } from '@/lib/timezone';
import { setEdgeTimezone } from '@/lib/invokeEdge';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  timezone: string;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateTimezone: (tz: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState<string>(() => getDetectedTimezone());

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync profile & timezone on user change
  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        const { data: profile, error } = await (supabase as any)
          .from('profiles')
          .select('timezone')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          const detected = getDetectedTimezone();
          await (supabase as any).from('profiles').insert({
            id: user.id,
            timezone: detected,
          });
          setTimezone(detected);
          setEdgeTimezone(detected);
        } else if (profile) {
          const tz = profile.timezone || getDetectedTimezone();
          setTimezone(tz);
          setEdgeTimezone(tz);
        }
      } catch {
        setTimezone(getDetectedTimezone());
      }
    };

    syncProfile();
  }, [user]);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateTimezone = async (tz: string) => {
    if (!user) return;
    setTimezone(tz);
    setEdgeTimezone(tz);
    try {
      await (supabase as any).from('profiles').update({ timezone: tz }).eq('id', user.id);
    } catch {
      // Silently fail
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, timezone, signUp, signIn, signOut, updateTimezone }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
