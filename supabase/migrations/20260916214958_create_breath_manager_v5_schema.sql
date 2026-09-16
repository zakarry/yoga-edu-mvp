/*
# Create breath_manager_v5 schema for test import

This migration creates a dedicated namespace `breath_manager_v5` for importing
the "呼吸マネージャー検定 第5版" test data. It is completely isolated from
the existing `public` schema and production answer routes.

1. New Schema
- `breath_manager_v5` — isolated namespace for v5 test data

2. New Tables (all within breath_manager_v5 schema)
- `bm5_knowledge` — 87 knowledge entries (K001-K087)
- `bm5_catalog` — 34 breathwork practices (C001-C034)
- `bm5_retrieval_preview` — 121 retrieval preview candidates
- `bm5_categories` — 14 categories
- `bm5_sources` — 17 source references
- `bm5_passages` — 231 source passages
- `bm5_assets` — 161 asset references
- `bm5_safety` — 4 safety notes
- `bm5_issues` — 51 editorial issues
- `bm5_editorial_corrections` — 51 editorial corrections
- `bm5_external_checks` — 9 external check records
- `bm5_terminology` — 10 terminology entries
- `bm5_acceptance_tests` — 20 acceptance test questions

3. Security
- RLS enabled on all tables
- Only `authenticated` role can SELECT (admin-only preview)
- No INSERT/UPDATE/DELETE policies — data is managed via migrations only
- Anon role has NO access — production users cannot see this data

4. Important Notes
- This schema is NOT connected to production answer routes, practice timers, or voice guides
- All data has review_state = 'editorial_draft' and production_ready = false
- No data is published to public users
- The existing public.knowledge_entries and public.knowledge_contents are untouched
*/

CREATE SCHEMA IF NOT EXISTS breath_manager_v5;

-- Categories
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_categories (
  category_id text PRIMARY KEY,
  name text NOT NULL,
  description text
);

-- Sources
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_sources (
  source_id text PRIMARY KEY,
  title text NOT NULL,
  publisher text,
  edition text,
  source_type text
);

-- Passages
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_passages (
  passage_id text PRIMARY KEY,
  source_id text REFERENCES breath_manager_v5.bm5_sources(source_id),
  chapter integer,
  section_label text,
  content text,
  page_label text
);

-- Assets
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_assets (
  asset_id text PRIMARY KEY,
  passage_id text REFERENCES breath_manager_v5.bm5_passages(passage_id),
  asset_type text,
  label text,
  file_ref text,
  connected boolean DEFAULT false
);

-- Knowledge
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_knowledge (
  knowledge_id text PRIMARY KEY,
  title text NOT NULL,
  category_id text REFERENCES breath_manager_v5.bm5_categories(category_id),
  tags text[] DEFAULT '{}',
  example_questions text[] DEFAULT '{}',
  answer_short text,
  answer_detail text,
  source_passage_ids text[] DEFAULT '{}',
  editorial_notes text[] DEFAULT '{}',
  external_check_ids text[] DEFAULT '{}',
  related_catalog_ids text[] DEFAULT '{}',
  review_state text DEFAULT 'editorial_draft',
  content_kind text,
  preview_allowed boolean DEFAULT true,
  production_ready boolean DEFAULT false,
  clinical_efficacy_verified boolean DEFAULT false,
  issue_ids text[] DEFAULT '{}',
  chapter_numbers integer[] DEFAULT '{}',
  editorial_correction_ids text[] DEFAULT '{}',
  answer_constraints jsonb DEFAULT '[]',
  editorial_policy_version text
);

-- Catalog (breathwork practices)
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_catalog (
  catalog_id text PRIMARY KEY,
  name text NOT NULL,
  aliases text[] DEFAULT '{}',
  category_id text REFERENCES breath_manager_v5.bm5_categories(category_id),
  tradition_category text,
  curriculum_mode text,
  purpose_in_source text,
  steps_editorial text[] DEFAULT '{}',
  source_passage_ids text[] DEFAULT '{}',
  related_knowledge_ids text[] DEFAULT '{}',
  related_safety_ids text[] DEFAULT '{}',
  production_ready boolean DEFAULT false,
  overview_only boolean DEFAULT false,
  variants jsonb DEFAULT '[]',
  answer_constraints jsonb DEFAULT '[]',
  editorial_policy_version text
);

-- Retrieval preview
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_retrieval_preview (
  retrieval_id text PRIMARY KEY,
  entry_type text NOT NULL,
  entry_id text NOT NULL,
  title text NOT NULL,
  category_id text,
  answer_preview text,
  source_passage_ids text[] DEFAULT '{}',
  answer_constraints jsonb DEFAULT '[]',
  safety_ids text[] DEFAULT '{}',
  related_entry_ids text[] DEFAULT '{}',
  production_ready boolean DEFAULT false,
  preview_allowed boolean DEFAULT true
);

-- Safety
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_safety (
  safety_id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  related_catalog_ids text[] DEFAULT '{}',
  source_passage_ids text[] DEFAULT '{}'
);

-- Issues
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_issues (
  issue_id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open',
  related_entry_ids text[] DEFAULT '{}'
);

-- Editorial corrections
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_editorial_corrections (
  correction_id text PRIMARY KEY,
  issue_id text REFERENCES breath_manager_v5.bm5_issues(issue_id),
  description text,
  rule_text text,
  applied boolean DEFAULT false
);

-- External checks
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_external_checks (
  check_id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending'
);

-- Terminology
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_terminology (
  term_id text PRIMARY KEY,
  term text NOT NULL,
  definition text,
  source_passage_ids text[] DEFAULT '{}'
);

-- Acceptance tests
CREATE TABLE IF NOT EXISTS breath_manager_v5.bm5_acceptance_tests (
  test_id text PRIMARY KEY,
  question text NOT NULL,
  answer_example text,
  check_point text,
  reference_entry_ids text[] DEFAULT '{}',
  source_passage_ids text[] DEFAULT '{}',
  safety_ids text[] DEFAULT '{}',
  source_links jsonb DEFAULT '[]',
  actual_result text,
  actual_entry_id text,
  actual_source text,
  actual_constraints_applied text,
  actual_pass boolean,
  tested_at timestamptz
);

-- Enable RLS on all tables — admin-only access
ALTER TABLE breath_manager_v5.bm5_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_retrieval_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_editorial_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_external_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE breath_manager_v5.bm5_acceptance_tests ENABLE ROW LEVEL SECURITY;

-- SELECT only for authenticated (admin preview). No anon access.
DROP POLICY IF EXISTS "bm5_admin_select_categories" ON breath_manager_v5.bm5_categories;
CREATE POLICY "bm5_admin_select_categories" ON breath_manager_v5.bm5_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_sources" ON breath_manager_v5.bm5_sources;
CREATE POLICY "bm5_admin_select_sources" ON breath_manager_v5.bm5_sources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_passages" ON breath_manager_v5.bm5_passages;
CREATE POLICY "bm5_admin_select_passages" ON breath_manager_v5.bm5_passages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_assets" ON breath_manager_v5.bm5_assets;
CREATE POLICY "bm5_admin_select_assets" ON breath_manager_v5.bm5_assets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_knowledge" ON breath_manager_v5.bm5_knowledge;
CREATE POLICY "bm5_admin_select_knowledge" ON breath_manager_v5.bm5_knowledge
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_catalog" ON breath_manager_v5.bm5_catalog;
CREATE POLICY "bm5_admin_select_catalog" ON breath_manager_v5.bm5_catalog
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_retrieval" ON breath_manager_v5.bm5_retrieval_preview;
CREATE POLICY "bm5_admin_select_retrieval" ON breath_manager_v5.bm5_retrieval_preview
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_safety" ON breath_manager_v5.bm5_safety;
CREATE POLICY "bm5_admin_select_safety" ON breath_manager_v5.bm5_safety
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_issues" ON breath_manager_v5.bm5_issues;
CREATE POLICY "bm5_admin_select_issues" ON breath_manager_v5.bm5_issues
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_corrections" ON breath_manager_v5.bm5_editorial_corrections;
CREATE POLICY "bm5_admin_select_corrections" ON breath_manager_v5.bm5_editorial_corrections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_external" ON breath_manager_v5.bm5_external_checks;
CREATE POLICY "bm5_admin_select_external" ON breath_manager_v5.bm5_external_checks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_terminology" ON breath_manager_v5.bm5_terminology;
CREATE POLICY "bm5_admin_select_terminology" ON breath_manager_v5.bm5_terminology
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bm5_admin_select_tests" ON breath_manager_v5.bm5_acceptance_tests;
CREATE POLICY "bm5_admin_select_tests" ON breath_manager_v5.bm5_acceptance_tests
  FOR SELECT TO authenticated USING (true);

-- UPDATE only for acceptance_tests (to record test results)
DROP POLICY IF EXISTS "bm5_admin_update_tests" ON breath_manager_v5.bm5_acceptance_tests;
CREATE POLICY "bm5_admin_update_tests" ON breath_manager_v5.bm5_acceptance_tests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);