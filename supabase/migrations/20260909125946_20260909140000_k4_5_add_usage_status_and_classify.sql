/*
# PHASE K4.5: Add Yoga Knowledge usage classification

1. Purpose
- Adds a separate usage-availability layer to the 335 K4 knowledge entries.
- Classifies existing source_text-backed entries for future public, My AI Teacher explanation, Pro Yoga teacher education, and AI Guru use.
- Does not rewrite source_text and does not generate summaries, public_content, ai_teacher_content, embeddings, or AI output.

2. New column
- `knowledge_entries.usage_status` text NOT NULL DEFAULT `source_only`.
- Allowed values: source_only, public_candidate, ai_explanation_candidate, teacher_candidate, guru_candidate, safety_review_required, restricted.

3. Classification rules
- Safety-sensitive entries, high-risk categories, or source text containing medical/contraindication terms are safety_review_required.
- editorial_status = review_needed is safety_review_required.
- teacher_education and guru_future scopes become teacher_candidate and guru_candidate.
- ai_teacher_explanation becomes ai_explanation_candidate only when not safety-sensitive and not otherwise blocked.
- reference_only becomes public_candidate only when candidate_ready, non-safety-sensitive, source_text exists, and a checked/final source mapping exists.
- All remaining entries stay source_only.

4. Data safety
- Existing source_text rows are not modified.
- No content generation or publication is performed.
- `is_published` is not changed.

5. Security
- Existing RLS on knowledge_entries remains unchanged: only published entries are client-readable.
- The internal knowledge_contents and knowledge_source_sections tables remain without public policies, so source_text remains inaccessible to anon/authenticated clients.
*/

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS usage_status text NOT NULL DEFAULT 'source_only';

ALTER TABLE knowledge_entries
  DROP CONSTRAINT IF EXISTS ke_usage_status_check;

ALTER TABLE knowledge_entries
  ADD CONSTRAINT ke_usage_status_check CHECK (
    usage_status IN (
      'source_only',
      'public_candidate',
      'ai_explanation_candidate',
      'teacher_candidate',
      'guru_candidate',
      'safety_review_required',
      'restricted'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ke_usage_status ON knowledge_entries(usage_status);

UPDATE knowledge_entries ke
SET usage_status = CASE
  WHEN ke.safety_sensitive = true
    OR ke.category IN ('asana', 'pranayama', 'breathing', 'anatomy', 'physiology', 'wellness', 'stress_management')
    OR EXISTS (
      SELECT 1
      FROM knowledge_contents kc
      WHERE kc.knowledge_entry_id = ke.id
        AND kc.content_kind = 'source_text'
        AND kc.content ~ '(病気|疾患|痛み|怪我|損傷|妊娠|妊婦|禁忌|高血圧|低血圧|糖尿病|手術|治療|うつ|精神病|喘息|偏頭痛|ヘルニア|関節炎)'
    )
    OR ke.editorial_status = 'review_needed'
    THEN 'safety_review_required'
  WHEN ke.ai_use_scope = 'teacher_education'
    THEN 'teacher_candidate'
  WHEN ke.ai_use_scope = 'guru_future'
    THEN 'guru_candidate'
  WHEN ke.ai_use_scope = 'ai_teacher_explanation'
    AND ke.safety_sensitive = false
    THEN 'ai_explanation_candidate'
  WHEN ke.ai_use_scope = 'reference_only'
    AND ke.safety_sensitive = false
    AND ke.editorial_status = 'candidate_ready'
    AND EXISTS (
      SELECT 1
      FROM knowledge_contents kc
      WHERE kc.knowledge_entry_id = ke.id
        AND kc.content_kind = 'source_text'
    )
    AND EXISTS (
      SELECT 1
      FROM knowledge_sources ks
      WHERE ks.entry_id = ke.id
        AND NULLIF(btrim(ks.source_title), '') IS NOT NULL
        AND ks.source_status IN ('checked', 'final')
    )
    THEN 'public_candidate'
  ELSE 'source_only'
END;
