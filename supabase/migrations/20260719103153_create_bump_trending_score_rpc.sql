/*
# bump_trending_score RPC

Atomically increments the trending_score of a community set by 1.
Called when a non-owner views a published community set, so the homepage
"Trending community set" reflects real popularity.
*/

CREATE OR REPLACE FUNCTION bump_trending_score(p_set_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE week_sets
  SET trending_score = trending_score + 1,
      updated_at = now()
  WHERE id = p_set_id
    AND scope = 'community'
    AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION bump_trending_score(uuid) TO anon, authenticated;
