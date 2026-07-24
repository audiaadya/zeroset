/*
# Add staff_pick and trending columns to week_sets

- `staff_pick` boolean — set true by host to feature a community set as a
  "Staff Pick" on the homepage.
- `trending_score` int — derived popularity score used to order the
  "Trending community set" on the homepage. Updated by the app when sets
  receive solutions/views. Defaults to 0.

No data is lost; both columns are nullable / defaulted.
*/

ALTER TABLE week_sets
  ADD COLUMN IF NOT EXISTS staff_pick boolean NOT NULL DEFAULT false;

ALTER TABLE week_sets
  ADD COLUMN IF NOT EXISTS trending_score int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_week_sets_staff_pick ON week_sets(staff_pick)
  WHERE staff_pick = true;
CREATE INDEX IF NOT EXISTS idx_week_sets_trending ON week_sets(trending_score DESC);
