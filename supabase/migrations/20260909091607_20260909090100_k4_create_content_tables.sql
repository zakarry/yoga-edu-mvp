/*
# K4: Knowledge Content Layer — source text storage (tables)

Creates knowledge_contents and knowledge_source_sections tables with RLS.
See migration 20260909090000 for full documentation.
*/

-- ============================================================
-- 1. knowledge_contents
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_entry_id uuid NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  content_kind text NOT NULL CHECK (
    content_kind IN ('source_text', 'editorial_summary', 'public_content', 'ai_teacher_content')
  ),
  language text NOT NULL DEFAULT 'ja',
  content text NOT NULL,
  content_status text NOT NULL DEFAULT 'source_only' CHECK (
    content_status IN ('source_only', 'editorial_review', 'approved', 'rejected')
  ),
  safety_review_status text NOT NULL DEFAULT 'not_reviewed' CHECK (
    safety_review_status IN ('not_reviewed', 'review_required', 'reviewed_safe', 'restricted')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (knowledge_entry_id, content_kind, language)
);

-- Index for lookups by entry
CREATE INDEX IF NOT EXISTS idx_knowledge_contents_entry
  ON knowledge_contents(knowledge_entry_id);

-- Index for filtering by content_kind
CREATE INDEX IF NOT EXISTS idx_knowledge_contents_kind
  ON knowledge_contents(content_kind);

-- Enable RLS
ALTER TABLE knowledge_contents ENABLE ROW LEVEL SECURITY;

-- No policies: source_text is internal-only, not readable by anon/authenticated
-- Future phases can add SELECT policies for approved public_content

-- ============================================================
-- 2. knowledge_source_sections
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_source_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_entry_id uuid NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  source_id uuid REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  section_type text CHECK (
    section_type IN (
      'definition', 'introduction', 'method', 'benefit', 'caution',
      'contraindication', 'note', 'example', 'history', 'concept',
      'teaching', 'other'
    )
  ),
  heading text,
  body text,
  source_order integer,
  created_at timestamptz DEFAULT now()
);

-- Index for lookups by entry
CREATE INDEX IF NOT EXISTS idx_knowledge_source_sections_entry
  ON knowledge_source_sections(knowledge_entry_id);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_knowledge_source_sections_order
  ON knowledge_source_sections(knowledge_entry_id, source_order);

-- Enable RLS
ALTER TABLE knowledge_source_sections ENABLE ROW LEVEL SECURITY;

-- No policies: internal-only, not readable by anon/authenticated

-- ============================================================
-- 3. Trigger for updated_at on knowledge_contents
-- ============================================================
DROP TRIGGER IF EXISTS trigger_knowledge_contents_updated_at ON knowledge_contents;
CREATE TRIGGER trigger_knowledge_contents_updated_at
  BEFORE UPDATE ON knowledge_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
