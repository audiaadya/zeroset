import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { isHostEmail } from './config';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  isHost: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string, referralSource?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured: isSupabaseConfigured,
      isHost: isHostEmail(session?.user?.email),
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      },
      signUp: async (email, password, displayName, referralSource) => {
        if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName, referral_source: referralSource ?? null } },
        });
        if (error) return { error: error.message };
        if (!data.user) return { error: 'Sign-up failed.' };
        // Best-effort: upsert the profile row with the referral source. If this
        // fails (e.g. RLS), the profile will be created on first syncMyProfile.
        if (data.user) {
          try {
            await supabase.from('profiles').upsert(
              {
                user_id: data.user.id,
                display_name: displayName,
                referral_source: referralSource ?? null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          } catch {
            // ignore — profile sync will fill it in later
          }
        }
        return { error: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useDisplayName(): string {
  const { user } = useAuth();
  if (!user) return 'anonymous';
  const meta = user.user_metadata as { display_name?: string } | undefined;
  return meta?.display_name || user.email?.split('@')[0] || 'mathlete';
}
