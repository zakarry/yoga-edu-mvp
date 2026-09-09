/*
# PHASE K3: Knowledge Base schema additions for Formal Master import

## Changes

### knowledge_entries: new columns
- master_id text UNIQUE — K2.6 editing management ID (YK-0001 etc.)
- practice_candidate boolean NOT NULL DEFAULT false — safe for AI Teacher practice layer
- teacher_candidate boolean NOT NULL DEFAULT false — for teacher education content
- safety_sensitive boolean NOT NULL DEFAULT false — contains medical/contraindication content
- editorial_status text NOT NULL DEFAULT 'candidate_ready' — editorial workflow status
- review_reason text nullable — why this entry is unpublished/review_needed

### knowledge_sources: new columns
- source_file text nullable — original Word file name
- source_section_no text nullable — section number from source
- source_entry_title text nullable — original entry title in source

### CHECK constraints
- editorial_status: candidate_ready, review_needed

### Indexes
- knowledge_entries.master_id
- knowledge_entries.editorial_status
- knowledge_entries.safety_sensitive
- knowledge_entries.practice_candidate
- knowledge_entries.teacher_candidate
*/

-- ============================================================
-- knowledge_entries: new columns
-- ============================================================

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS master_id text UNIQUE;

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS practice_candidate boolean NOT NULL DEFAULT false;

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS teacher_candidate boolean NOT NULL DEFAULT false;

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS safety_sensitive boolean NOT NULL DEFAULT false;

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS editorial_status text NOT NULL DEFAULT 'candidate_ready';

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS review_reason text;

-- editorial_status CHECK
ALTER TABLE knowledge_entries
  DROP CONSTRAINT IF EXISTS ke_editorial_status_check;

ALTER TABLE knowledge_entries
  ADD CONSTRAINT ke_editorial_status_check CHECK (
    editorial_status IN ('candidate_ready', 'review_needed')
  );

-- ============================================================
-- knowledge_sources: new columns
-- ============================================================

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS source_file text;

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS source_section_no text;

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS source_entry_title text;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ke_master_id ON knowledge_entries(master_id);
CREATE INDEX IF NOT EXISTS idx_ke_editorial_status ON knowledge_entries(editorial_status);
CREATE INDEX IF NOT EXISTS idx_ke_safety_sensitive ON knowledge_entries(safety_sensitive);
CREATE INDEX IF NOT EXISTS idx_ke_practice_candidate ON knowledge_entries(practice_candidate);
CREATE INDEX IF NOT EXISTS idx_ke_teacher_candidate ON knowledge_entries(teacher_candidate);
