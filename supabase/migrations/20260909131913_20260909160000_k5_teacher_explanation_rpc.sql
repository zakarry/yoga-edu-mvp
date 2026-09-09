/*
# K5: Safe Knowledge Explanation RPC for My AI Teacher

1. Purpose
- Returns public_content for entries with usage_status = 'ai_explanation_candidate'.
- Used by My AI Teacher for explanation-only responses.
- Does NOT return source_text, editorial_summary, or any other content kind.
- Does NOT expose entries with other usage_status values.

2. Security
- SECURITY DEFINER with fixed search_path.
- Callable by anon and authenticated (the app uses the anon key client).
- Only returns rows where usage_status = 'ai_explanation_candidate' AND content_kind = 'public_content' AND content_status = 'editorial_review'.
- Returns: master_id, title_ja, category, public_content, usage_status, source_count.
- source_text is never returned.
*/

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
    'publicContent', kc.content,
    'usageStatus', ke.usage_status,
    'sourceCount', (SELECT count(*)::int FROM knowledge_sources ks WHERE ks.entry_id = ke.id)
  )), '[]'::jsonb)
  INTO v_result
  FROM knowledge_entries ke
  JOIN knowledge_contents kc ON kc.knowledge_entry_id = ke.id
  WHERE ke.usage_status = 'ai_explanation_candidate'
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

GRANT EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) TO anon, authenticated;
