/*
# Analytics Engine: events table + host dashboard RPC

1. Purpose
   Creates a unified analytics events table and a server-side aggregation
   RPC function so the Host Dashboard can pull all metrics in a single call.

2. New Tables
   - `analytics_events` — stores page_view, solution_submitted, user_signup, cta_click events
    - id (uuid PK), event_type (text), event_data (jsonb), user_id (uuid FK auth.users),
      session_id (text), created_at (timestamptz)
    - Indexes on event_type, user_id, created_at

3. New RPC Function
   - `get_host_dashboard_analytics()` — SECURITY DEFINER, returns JSON with all metrics:
     total_signups, total_solution_submissions, correct_solutions, unique_active_visitors,
     total_pageviews, pageviews_7d, cta_clicks, cta_breakdown, sudden_death stats,
     bounty stats, forum stats, daily_pageviews, top_paths, new_users, weekly_active_solvers

4. Security
   - RLS enabled on analytics_events
   - anon + authenticated can INSERT (public event logging)
   - authenticated can SELECT (host reads)
   - RPC is SECURITY DEFINER to bypass RLS for aggregation
*/

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_analytics_events" ON analytics_events;
CREATE POLICY "anon_insert_analytics_events" ON analytics_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "host_select_analytics_events" ON analytics_events;
CREATE POLICY "host_select_analytics_events" ON analytics_events FOR SELECT
  TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.get_host_dashboard_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_total_signups int;
  v_total_solutions int;
  v_correct_solutions int;
  v_unique_visitors int;
  v_total_pageviews int;
  v_pageviews_7d int;
  v_cta_clicks int;
  v_sd_attempts int;
  v_sd_correct int;
  v_bounty_open int;
  v_bounty_solved int;
  v_forum_threads int;
  v_forum_replies int;
  v_new_users_7d int;
  v_new_users_30d int;
  v_weekly_active_solvers int;
  v_daily_pageviews json;
  v_top_paths json;
  v_cta_breakdown json;
BEGIN
  SELECT count(*) INTO v_total_signups FROM profiles;
  SELECT count(*) INTO v_total_solutions FROM solutions;
  SELECT count(*) INTO v_correct_solutions FROM solutions WHERE is_correct = true;

  SELECT count(DISTINCT session_id) INTO v_unique_visitors FROM analytics_events WHERE session_id IS NOT NULL;
  SELECT count(*) INTO v_total_pageviews FROM analytics_events WHERE event_type = 'page_view';
  SELECT count(*) INTO v_pageviews_7d FROM analytics_events WHERE event_type = 'page_view' AND created_at >= now() - interval '7 days';
  SELECT count(*) INTO v_cta_clicks FROM analytics_events WHERE event_type = 'cta_click';

  SELECT count(*) INTO v_sd_attempts FROM sudden_death_submissions;
  SELECT count(*) INTO v_sd_correct FROM sudden_death_submissions WHERE correct = true;

  SELECT count(*) INTO v_bounty_open FROM bounty_boards WHERE status = 'open';
  SELECT count(*) INTO v_bounty_solved FROM bounty_boards WHERE status = 'solved';

  SELECT count(*) INTO v_forum_threads FROM forum_threads;
  SELECT count(*) INTO v_forum_replies FROM forum_replies;

  SELECT count(*) INTO v_new_users_7d FROM profiles WHERE created_at >= now() - interval '7 days';
  SELECT count(*) INTO v_new_users_30d FROM profiles WHERE created_at >= now() - interval '30 days';

  SELECT count(DISTINCT author_id) INTO v_weekly_active_solvers
  FROM solutions
  WHERE created_at >= now() - interval '7 days' AND author_id IS NOT NULL;

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_daily_pageviews
  FROM (
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day, count(e.id) AS count
    FROM generate_series(now() - interval '13 days', now(), '1 day') AS d(day)
    LEFT JOIN analytics_events e
      ON e.event_type = 'page_view'
      AND to_char(e.created_at, 'YYYY-MM-DD') = to_char(d.day, 'YYYY-MM-DD')
    GROUP BY d.day
    ORDER BY d.day
  ) t;

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_top_paths
  FROM (
    SELECT
      coalesce(e.event_data->>'path', 'unknown') AS path,
      count(*) AS count
    FROM analytics_events e
    WHERE e.event_type = 'page_view'
    GROUP BY e.event_data->>'path'
    ORDER BY count DESC
    LIMIT 10
  ) t;

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_cta_breakdown
  FROM (
    SELECT
      coalesce(e.event_data->>'cta_id', 'unknown') AS cta_id,
      count(*) AS count
    FROM analytics_events e
    WHERE e.event_type = 'cta_click'
    GROUP BY e.event_data->>'cta_id'
    ORDER BY count DESC
  ) t;

  result := json_build_object(
    'total_signups', v_total_signups,
    'total_solution_submissions', v_total_solutions,
    'correct_solutions', v_correct_solutions,
    'unique_active_visitors', v_unique_visitors,
    'total_pageviews', v_total_pageviews,
    'pageviews_7d', v_pageviews_7d,
    'cta_clicks', v_cta_clicks,
    'sudden_death_attempts', v_sd_attempts,
    'sudden_death_correct', v_sd_correct,
    'sudden_death_failures', v_sd_attempts - v_sd_correct,
    'bounty_open', v_bounty_open,
    'bounty_solved', v_bounty_solved,
    'forum_threads', v_forum_threads,
    'forum_replies', v_forum_replies,
    'new_users_7d', v_new_users_7d,
    'new_users_30d', v_new_users_30d,
    'weekly_active_solvers', v_weekly_active_solvers,
    'daily_pageviews', v_daily_pageviews,
    'top_paths', v_top_paths,
    'cta_breakdown', v_cta_breakdown
  );

  RETURN result;
END;
$$;
