-- Add edit_reason and deletion log infrastructure
-- Tracks why content was edited or deleted

-- deletion_log: records who deleted what and why
CREATE TABLE IF NOT EXISTS deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleter_name text,
  table_name text NOT NULL,
  record_id text NOT NULL,
  record_summary text,
  reason text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE deletion_log ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert a deletion log entry (they're deleting their own content)
DROP POLICY IF EXISTS "insert_deletion_log" ON deletion_log;
CREATE POLICY "insert_deletion_log" ON deletion_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- Host can view all deletion logs
DROP POLICY IF EXISTS "select_deletion_log_host" ON deletion_log;
CREATE POLICY "select_deletion_log_host" ON deletion_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'miadayshaar2@gmail.com'
    )
  );

-- edit_log: records who edited what and why
CREATE TABLE IF NOT EXISTS edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  editor_name text,
  table_name text NOT NULL,
  record_id text NOT NULL,
  reason text NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE edit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_edit_log" ON edit_log;
CREATE POLICY "insert_edit_log" ON edit_log FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_edit_log_host" ON edit_log;
CREATE POLICY "select_edit_log_host" ON edit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'miadayshaar2@gmail.com'
    )
  );

CREATE INDEX IF NOT EXISTS idx_deletion_log_deleted_at ON deletion_log(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_edit_log_edited_at ON edit_log(edited_at DESC);
