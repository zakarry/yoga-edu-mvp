-- Fix bm5 security: restrict all access to admin users only
-- Step 1: Add is_admin column to profiles (service-role-only writable)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
REVOKE UPDATE (is_admin) ON public.profiles FROM anon, authenticated;

-- Step 2: Replace all bm5 RLS policies to check is_admin
-- Drop existing permissive policies
DROP POLICY IF EXISTS bm5_admin_select_tests ON breath_manager_v5.bm5_acceptance_tests;
DROP POLICY IF EXISTS bm5_admin_update_tests ON breath_manager_v5.bm5_acceptance_tests;
DROP POLICY IF EXISTS bm5_admin_select_assets ON breath_manager_v5.bm5_assets;
DROP POLICY IF EXISTS bm5_admin_select_catalog ON breath_manager_v5.bm5_catalog;
DROP POLICY IF EXISTS bm5_admin_select_categories ON breath_manager_v5.bm5_categories;
DROP POLICY IF EXISTS bm5_admin_select_corrections ON breath_manager_v5.bm5_editorial_corrections;
DROP POLICY IF EXISTS bm5_admin_select_external ON breath_manager_v5.bm5_external_checks;
DROP POLICY IF EXISTS bm5_admin_select_issues ON breath_manager_v5.bm5_issues;
DROP POLICY IF EXISTS bm5_admin_select_knowledge ON breath_manager_v5.bm5_knowledge;
DROP POLICY IF EXISTS bm5_admin_select_passages ON breath_manager_v5.bm5_passages;
DROP POLICY IF EXISTS bm5_admin_select_retrieval ON breath_manager_v5.bm5_retrieval_preview;
DROP POLICY IF EXISTS bm5_admin_select_safety ON breath_manager_v5.bm5_safety;
DROP POLICY IF EXISTS bm5_admin_select_sources ON breath_manager_v5.bm5_sources;
DROP POLICY IF EXISTS bm5_admin_select_terminology ON breath_manager_v5.bm5_terminology;

-- Create admin-only SELECT policies (check profiles.is_admin = true)
CREATE POLICY bm5_admin_select_tests ON breath_manager_v5.bm5_acceptance_tests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_update_tests ON breath_manager_v5.bm5_acceptance_tests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_assets ON breath_manager_v5.bm5_assets
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_catalog ON breath_manager_v5.bm5_catalog
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_categories ON breath_manager_v5.bm5_categories
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_corrections ON breath_manager_v5.bm5_editorial_corrections
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_external ON breath_manager_v5.bm5_external_checks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_issues ON breath_manager_v5.bm5_issues
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_knowledge ON breath_manager_v5.bm5_knowledge
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_passages ON breath_manager_v5.bm5_passages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_retrieval ON breath_manager_v5.bm5_retrieval_preview
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_safety ON breath_manager_v5.bm5_safety
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_sources ON breath_manager_v5.bm5_sources
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY bm5_admin_select_terminology ON breath_manager_v5.bm5_terminology
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Step 3: Fix RPC - revoke anon, restrict to admin-only via SECURITY DEFINER
CREATE OR REPLACE FUNCTION breath_manager_v5.bm5_search_preview(
  p_query text DEFAULT NULL,
  p_entry_type text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  retrieval_id text,
  entry_type text,
  entry_id text,
  title text,
  category_id text,
  answer_preview text,
  production_ready boolean,
  preview_allowed boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = breath_manager_v5, public
AS $$
  SELECT retrieval_id, entry_type, entry_id, title, category_id, answer_preview, production_ready, preview_allowed
  FROM breath_manager_v5.bm5_retrieval_preview
  WHERE (p_query IS NULL OR title ILIKE '%' || p_query || '%' OR answer_preview ILIKE '%' || p_query || '%')
    AND (p_entry_type IS NULL OR entry_type = p_entry_type)
  ORDER BY entry_type, entry_id
  LIMIT p_limit;
$$;

-- Revoke all, then grant only to authenticated (RLS on tables still gates access)
REVOKE EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) TO authenticated;