-- K6.3.1: Update lookup_teacher_explanation RPC
-- Allow safety_sensitive=true entries when their public_content has safety_review_status='reviewed_safe'
-- Existing safety_sensitive=false entries remain unchanged (backward compatible)
-- Returns only: masterId, title, category, publicContent (4 columns, no source_text or safety metadata)

DROP FUNCTION IF EXISTS public.lookup_teacher_explanation(text);

CREATE FUNCTION public.lookup_teacher_explanation(p_search text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'masterId', ke.master_id,
    'title', ke.title_ja,
    'category', ke.category,
    'publicContent', kc.content
  )), '[]'::jsonb)
  INTO v_result
  FROM knowledge_entries ke
  JOIN knowledge_contents kc ON kc.knowledge_entry_id = ke.id
  WHERE ke.usage_status IN ('ai_explanation_candidate', 'public_candidate')
  AND kc.content_kind = 'public_content'
  AND kc.content_status = 'editorial_review'
  AND (
    ke.safety_sensitive = false
    OR (ke.safety_sensitive = true AND kc.safety_review_status = 'reviewed_safe')
  )
  AND (
    p_search IS NULL OR btrim(p_search) = ''
    OR ke.title_ja ILIKE '%' || p_search || '%'
    OR ke.category ILIKE '%' || p_search || '%'
    OR kc.content ILIKE '%' || p_search || '%'
    OR ke.slug ILIKE '%' || p_search || '%'
  );

  RETURN v_result;
END;
$$;

-- Revoke public/anon execute, grant authenticated only
REVOKE EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) TO authenticated;
