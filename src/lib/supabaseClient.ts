import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.warn(
    '[ZeroSet] Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. The site will run in read-only demo mode.'
  );
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = Boolean(url && anonKey);
