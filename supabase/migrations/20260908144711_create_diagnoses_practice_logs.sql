/*
# Create diagnoses and practice_logs tables with RLS

## Purpose
Phase 2 of the Yoga AI Supabase integration. Creates the two tables that store
user-generated clinical data — diagnosis results and practice logs — with full
Row Level Security and CHECK constraints.

## New Tables

### 1. diagnoses
- `id` uuid, primary key, default gen_random_uuid()
- `user_id` uuid, not null, references auth.users(id) ON DELETE CASCADE
- `diagnosis_type` text, not null — CHECK ('student', 'teacher')
- `schema_version` text, not null — e.g. 'student-v2', 'teacher-v1'
- `answers_json` jsonb — diagnosis answers (sanitized if sensitive storage is off)
- `condition_record_json` jsonb, nullable — physical/mental condition data
- `learning_record_json` jsonb, nullable — learning/preference data
- `result_type` text, nullable — e.g. style ID
- `score_json` jsonb, nullable — flexible score payload
- `safety_state` text, not null, default 'normal' — CHECK ('normal', 'caution', 'stop_and_refer')
- `requires_human_review` boolean, not null, default false
- `safety_category` text, nullable — CHECK ('pain', 'injury', 'medical_condition', 'pregnancy_postpartum', 'exercise_restriction', 'red_flag', 'other')
- `created_at` timestamptz, default now()

Diagnoses are immutable: no UPDATE policy. Re-diagnosis = new INSERT.
Users can DELETE their own diagnosis history.

### 2. practice_logs
- `id` uuid, primary key, default gen_random_uuid()
- `user_id` uuid, not null, references auth.users(id) ON DELETE CASCADE
- `practice_type` text, not null — CHECK ('asana', 'pranayama', 'dhyana')
- `practice_name` text, not null
- `duration_min` integer, nullable — CHECK (>= 0)
- `mood_before` text, nullable
- `mood_after` text, nullable
- `note` text, nullable
- `ai_teacher_used` boolean, default false
- `safety_state` text, not null, default 'normal' — CHECK ('normal', 'caution', 'stop_and_refer')
- `requires_human_review` boolean, not null, default false
- `safety_category` text, nullable — CHECK ('pain', 'injury', 'medical_condition', 'pregnancy_postpartum', 'exercise_restriction', 'other')
- `created_at` timestamptz, default now()

Users can SELECT, INSERT, and DELETE their own practice logs. No UPDATE —
practice logs are immutable records.

## Security (RLS)
Both tables have RLS enabled. Policies scoped TO authenticated with
auth.uid() ownership checks:
- diagnoses: SELECT / INSERT / DELETE own rows
- practice_logs: SELECT / INSERT / DELETE own rows

No UPDATE policies — records are immutable. Corrections = new INSERT.
*/

-- =========================================================
-- 1. diagnoses table
-- =========================================================
CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis_type text NOT NULL CHECK (diagnosis_type IN ('student', 'teacher')),
  schema_version text NOT NULL,
  answers_json jsonb,
  condition_record_json jsonb,
  learning_record_json jsonb,
  result_type text,
  score_json jsonb,
  safety_state text NOT NULL DEFAULT 'normal' CHECK (safety_state IN ('normal', 'caution', 'stop_and_refer')),
  requires_human_review boolean NOT NULL DEFAULT false,
  safety_category text CHECK (safety_category IN ('pain', 'injury', 'medical_condition', 'pregnancy_postpartum', 'exercise_restriction', 'red_flag', 'other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_diagnoses" ON diagnoses;
CREATE POLICY "select_own_diagnoses" ON diagnoses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_diagnoses" ON diagnoses;
CREATE POLICY "insert_own_diagnoses" ON diagnoses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_diagnoses" ON diagnoses;
CREATE POLICY "delete_own_diagnoses" ON diagnoses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 2. practice_logs table
-- =========================================================
CREATE TABLE IF NOT EXISTS practice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_type text NOT NULL CHECK (practice_type IN ('asana', 'pranayama', 'dhyana')),
  practice_name text NOT NULL,
  duration_min integer CHECK (duration_min >= 0),
  mood_before text,
  mood_after text,
  note text,
  ai_teacher_used boolean NOT NULL DEFAULT false,
  safety_state text NOT NULL DEFAULT 'normal' CHECK (safety_state IN ('normal', 'caution', 'stop_and_refer')),
  requires_human_review boolean NOT NULL DEFAULT false,
  safety_category text CHECK (safety_category IN ('pain', 'injury', 'medical_condition', 'pregnancy_postpartum', 'exercise_restriction', 'other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE practice_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_practice_logs" ON practice_logs;
CREATE POLICY "select_own_practice_logs" ON practice_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_practice_logs" ON practice_logs;
CREATE POLICY "insert_own_practice_logs" ON practice_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_practice_logs" ON practice_logs;
CREATE POLICY "delete_own_practice_logs" ON practice_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
