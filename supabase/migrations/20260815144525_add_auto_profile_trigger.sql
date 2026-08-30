/*
# Auto-create profile on signup

1. Purpose
   When a new user registers via Supabase Auth, no row is created in the
   `profiles` table automatically. The frontend tries to upsert on signup
   but this can fail silently (RLS, network, etc.), resulting in 0 profiles
   even though users exist in `auth.users`. This migration adds a database
   trigger that fires on every new `auth.users` insert and creates a
   matching `profiles` row, so the analytics dashboard and leaderboard
   always reflect accurate sign-up counts.

2. Changes
   - Creates function `public.handle_new_user()` that inserts a profile row
     using the new user's id, email, and display_name from user_metadata.
   - Creates trigger `on_auth_user_created` on `auth.users` to call the
     function AFTER INSERT.

3. Security
   - The function is SECURITY DEFINER so it can write to `profiles` even
     though the trigger runs as the auth user.
   - The function only inserts (never updates or deletes), so it cannot
     be used to modify existing profiles.
   - `search_path` is set to `public` to prevent schema-injection.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
