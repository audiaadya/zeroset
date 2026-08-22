-- Add AI grading columns to solutions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solutions' AND column_name = 'ai_graded'
  ) THEN
    ALTER TABLE solutions ADD COLUMN ai_graded boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solutions' AND column_name = 'ai_confidence'
  ) THEN
    ALTER TABLE solutions ADD COLUMN ai_confidence float;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solutions' AND column_name = 'ai_reasoning'
  ) THEN
    ALTER TABLE solutions ADD COLUMN ai_reasoning text;
  END IF;
END $$;
