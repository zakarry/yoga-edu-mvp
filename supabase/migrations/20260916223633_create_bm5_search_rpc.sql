-- Create retrieval search RPC for breath_manager_v5 (admin-only)
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

-- Only authenticated users can call this
REVOKE EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) TO authenticated;