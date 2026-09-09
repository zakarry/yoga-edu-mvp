/*
# K5.1: Harden lookup_teacher_explanation RPC

1. Purpose
- Tighten EXECUTE grants: revoke PUBLIC and anon, keep authenticated only.
- Add safety_sensitive = false filter to exclude sensitive entries.
- Minimize returned columns: master_id, title_ja, category, public_content only.
- Remove usageStatus and sourceCount from output.

2. Security
- SECURITY DEFINER retained (knowledge_contents has RLS with no policies; direct client SELECT returns nothing).
- search_path fixed to public.
- No SQL string concatenation; p_search used as ILIKE parameter only.
- Filters fixed inside function body: usage_status, content_kind, content_status, safety_sensitive.

3. Data safety
- No source_text or editorial_summary returned.
- No DROP, no column type changes, no data modifications.
*/

REVOKE EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) FROM PUBLIC, anon;

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
  WHERE ke.usage_status = 'ai_explanation_candidate'
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

GRANT EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) TO authenticated;
