-- Fix 1: Add internal admin check to bm5_search_preview RPC
-- The RPC is SECURITY DEFINER so it bypasses RLS.
-- We must check auth.uid() against profiles.is_admin inside the function body.
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = breath_manager_v5, public
AS $$
BEGIN
  -- Server-side admin check: reject non-admin users
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    rp.retrieval_id,
    rp.entry_type,
    rp.entry_id,
    rp.title,
    rp.category_id,
    rp.answer_preview,
    rp.production_ready,
    rp.preview_allowed
  FROM breath_manager_v5.bm5_retrieval_preview rp
  WHERE (p_query IS NULL OR rp.title ILIKE '%' || p_query || '%' OR rp.answer_preview ILIKE '%' || p_query || '%')
    AND (p_entry_type IS NULL OR rp.entry_type = p_entry_type)
  ORDER BY rp.entry_type, rp.entry_id
  LIMIT p_limit;
END;
$$;

-- Revoke anon, keep authenticated (RPC internally checks admin)
REVOKE EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) FROM anon;
GRANT EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) TO authenticated;

-- Fix 2: Add SELECT policy on profiles so users can read their own is_admin flag
-- (needed for the frontend admin check, which is a UI hint only — server-side is the real gate)
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Fix 3: Ensure is_admin column is not writable by users (only service role can set it)
-- Revoke UPDATE on is_admin from authenticated (already done in previous migration, double-check)
REVOKE UPDATE (is_admin) ON public.profiles FROM anon, authenticated;
