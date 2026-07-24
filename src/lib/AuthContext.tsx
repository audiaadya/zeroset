import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { isHostEmail } from './config';
import { ensureTeamMembership, fetchMyTeamMembership, type TeamRole, type TeamMember } from './permissions';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  isHost: boolean;
  teamRole: TeamRole | null;
  teamMember: TeamMember | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string, referralSource?: string, emailConsent?: boolean) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);

  // Load the team membership for the current user.
  const loadTeamMembership = async (userId: string, email: string) => {
    const membership = await fetchMyTeamMembership();
    if (membership) {
      setTeamMember(membership);
    } else {
      // Auto-create on first sign-in (checks for pending invitation)
      const created = await ensureTeamMembership(email, userId);
      setTeamMember(created);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        const email = data.session.user.email ?? '';
        void loadTeamMembership(data.session.user.id, email).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          const email = newSession.user.email ?? '';
          await loadTeamMembership(newSession.user.id, email);
        } else {
          setTeamMember(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured: isSupabaseConfigured,
      isHost: isHostEmail(session?.user?.email) || teamMember?.role === 'admin' || teamMember?.role === 'marketing' || teamMember?.role === 'community_manager',
      teamRole: teamMember?.role ?? null,
      teamMember,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      },
      signUp: async (email, password, displayName, referralSource, emailConsent) => {
        if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName, referral_source: referralSource ?? null, email_consent: emailConsent ?? false } },
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
                email: email,
                referral_source: referralSource ?? null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
            // Record email consent
            if (emailConsent) {
              await supabase.from('email_consent').upsert(
                {
                  user_id: data.user.id,
                  consented: true,
                  consented_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
              );
            }
          } catch {
            // ignore — profile sync will fill it in later
          }
        }
        return { error: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setTeamMember(null);
      },
    }),
    [session, loading, teamMember]
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
