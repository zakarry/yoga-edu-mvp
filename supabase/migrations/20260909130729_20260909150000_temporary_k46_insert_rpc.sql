/*
# Temporary K4.6 editorial content insertion RPC

1. Purpose
- Inserts editorial_summary and public_content rows for the 14 safe-candidate entries.
- Accepts a JSON payload with entry_id, content_kind, and content.
- Only allows editorial_summary and public_content content kinds.
- Sets content_status = 'editorial_review' and safety_review_status = 'not_reviewed'.

2. Security
- SECURITY DEFINER with fixed search_path.
- Anonymous execution granted temporarily; will be revoked immediately after import.
- No source_text rows are modified.
*/

CREATE OR REPLACE FUNCTION public.insert_k46_editorial_content(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid := (payload->>'entry_id')::uuid;
  v_kind text := payload->>'content_kind';
  v_content text := payload->>'content';
  v_language text := COALESCE(payload->>'language', 'ja');
BEGIN
  IF v_entry_id IS NULL OR v_content IS NULL OR btrim(v_content) = '' THEN
    RAISE EXCEPTION 'invalid payload';
  END IF;
  IF v_kind NOT IN ('editorial_summary', 'public_content') THEN
    RAISE EXCEPTION 'only editorial_summary and public_content are allowed';
  END IF;

  INSERT INTO knowledge_contents (
    knowledge_entry_id, content_kind, language, content, content_status, safety_review_status
  ) VALUES (
    v_entry_id, v_kind, v_language, v_content, 'editorial_review', 'not_reviewed'
  )
  ON CONFLICT (knowledge_entry_id, content_kind, language) DO UPDATE SET
    content = EXCLUDED.content,
    content_status = EXCLUDED.content_status,
    safety_review_status = EXCLUDED.safety_review_status,
    updated_at = now();

  RETURN jsonb_build_object('entry_id', v_entry_id, 'content_kind', v_kind, 'status', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_k46_editorial_content(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.insert_k46_editorial_content(jsonb) TO authenticated;
