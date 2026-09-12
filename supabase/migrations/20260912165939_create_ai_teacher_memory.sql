/*
# Create ai_teacher_memory table for 4-layer AI Teacher architecture

1. New Tables
- `ai_teacher_memory`: Stores long-term user understanding ("My Yoga Memory").
  Each row is a single memory entry: favorite practice, preferred time,
  user-reported concern, etc. NOT medical diagnosis — concerns are stored
  as user-reported text only, with source = 'user_reported'.
  Columns:
  - `id` (uuid PK)
  - `user_id` (uuid NOT NULL, DEFAULT auth.uid(), FK to auth.users)
  - `entry_type` (text NOT NULL) — favorite_practice, disliked_practice,
    frequent_practice, preferred_duration, preferred_time,
    preferred_explanation_style, preferred_teacher_tone, goal,
    user_reported_concern, practice_history_note, streak_note
  - `label` (text NOT NULL) — short human-readable label
  - `detail` (text) — longer description, nullable
  - `source` (text NOT NULL DEFAULT 'user_reported') —
    user_reported, inferred_from_practice, inferred_from_diagnosis
  - `active` (boolean NOT NULL DEFAULT true) — soft-disable toggle
  - `created_at` (timestamptz DEFAULT now())
  - `last_confirmed_at` (timestamptz) — last time user confirmed this is still true

2. Security
- Enable RLS on `ai_teacher_memory`.
- Owner-scoped CRUD: each authenticated user can only access their own memory entries.
- 4 separate policies (SELECT/INSERT/UPDATE/DELETE), scoped TO authenticated.
*/

CREATE TABLE IF NOT EXISTS ai_teacher_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type text NOT NULL,
  label text NOT NULL,
  detail text,
  source text NOT NULL DEFAULT 'user_reported',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_teacher_memory_user_id
  ON ai_teacher_memory(user_id);

ALTER TABLE ai_teacher_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_memory" ON ai_teacher_memory;
CREATE POLICY "select_own_memory"
  ON ai_teacher_memory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_memory" ON ai_teacher_memory;
CREATE POLICY "insert_own_memory"
  ON ai_teacher_memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_memory" ON ai_teacher_memory;
CREATE POLICY "update_own_memory"
  ON ai_teacher_memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_memory" ON ai_teacher_memory;
CREATE POLICY "delete_own_memory"
  ON ai_teacher_memory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
