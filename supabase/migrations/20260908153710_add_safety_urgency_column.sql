/*
# Add safety_urgency column to diagnoses and practice_logs

## Purpose
Refine the AI Teacher safety model. The existing `safety_state` column captures
the broad category (normal / caution / stop_and_refer), but we also need to
record the original urgency level that triggered the safety decision.

## Changes
- Add `safety_urgency` text column to `diagnoses` (nullable, default 'none')
- Add `safety_urgency` text column to `practice_logs` (nullable, default 'none')
- CHECK constraint: safety_urgency IN ('none', 'routine', 'prompt', 'urgent')

## Final safety mapping

| safetyOutcome | safety_state    | safety_urgency | requires_human_review |
|---------------|-----------------|----------------|----------------------|
| (none/cleared)| normal          | none           | false                |
| routine       | caution         | routine        | true                 |
| prompt        | caution         | prompt         | true                 |
| urgent        | stop_and_refer  | urgent         | true                 |

`requires_human_review` means a human professional consultation was recommended.
It does NOT trigger any automatic notification to teachers or medical staff.

## Notes
1. Idempotent — safe to re-run.
2. No data loss — existing rows get the default 'none'.
*/

ALTER TABLE diagnoses
  ADD COLUMN IF NOT EXISTS safety_urgency text NOT NULL DEFAULT 'none'
  CHECK (safety_urgency IN ('none', 'routine', 'prompt', 'urgent'));

ALTER TABLE practice_logs
  ADD COLUMN IF NOT EXISTS safety_urgency text NOT NULL DEFAULT 'none'
  CHECK (safety_urgency IN ('none', 'routine', 'prompt', 'urgent'));
