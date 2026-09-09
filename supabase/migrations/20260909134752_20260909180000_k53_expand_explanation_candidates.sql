/*
# K5.3: Expand lookup_teacher_explanation to include public_candidate

1. Scope
- Add 'public_candidate' to the usage_status filter alongside 'ai_explanation_candidate'.
- All other hardening from K5.1 remains: safety_sensitive=false, content_kind=public_content,
  content_status=editorial_review, 4-column return only.

2. Security (unchanged from K5.1)
- SECURITY DEFINER, search_path=public
- EXECUTE: authenticated only (anon/PUBLIC revoked after creation)
- No source_text, editorial_summary, ai_teacher_content, review_reason, or internal metadata returned.

3. Data safety
- No DROP of columns, no type changes, no data modifications.
*/

DROP FUNCTION IF EXISTS public.lookup_teacher_explanation(text);

CREATE OR REPLACE FUNCTION public.lookup_teacher_explanation(p_search text DEFAULT NULL)
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
    AND ke.safety_sensitive = false
    AND kc.content_kind = 'public_content'
    AND kc.content_status = 'editorial_review'
    AND (p_search IS NULL OR btrim(p_search) = ''
         OR ke.title_ja ILIKE '%' || p_search || '%'
         OR ke.category ILIKE '%' || p_search || '%'
         OR kc.content ILIKE '%' || p_search || '%'
         OR ke.slug ILIKE '%' || p_search || '%');

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) TO authenticated;
