/*
# Expand practice_logs.practice_type CHECK constraint

## Purpose
The `practice_logs_practice_type_check` constraint only allowed
`'asana'`, `'pranayama'`, `'dhyana'`. The frontend now also saves:
- `'sequence'` — a single named sequence like Surya Namaskar
- `'program'` — an AI-teacher-generated multi-pose program ("今日のプログラム")

These were rejected by the DB, causing program saves to fail and
fall back to local-only storage.

## Changes
1. Drop the existing CHECK constraint `practice_logs_practice_type_check`.
2. Recreate it with the expanded allowed values:
   `'asana'`, `'pranayama'`, `'dhyana'`, `'sequence'`, `'program'`.

## Data Safety
- No existing rows are modified or deleted.
- No columns are renamed or retyped.
- Existing values (`'asana'`, `'pranayama'`, `'dhyana'`) remain valid.
- RLS policies are unchanged.
*/

ALTER TABLE public.practice_logs
  DROP CONSTRAINT IF EXISTS practice_logs_practice_type_check;

ALTER TABLE public.practice_logs
  ADD CONSTRAINT practice_logs_practice_type_check
  CHECK (practice_type = ANY (ARRAY[
    'asana'::text,
    'pranayama'::text,
    'dhyana'::text,
    'sequence'::text,
    'program'::text
  ]));
