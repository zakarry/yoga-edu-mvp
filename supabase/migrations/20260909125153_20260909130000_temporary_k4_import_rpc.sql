/*
# Temporary K4 source-content import RPC

1. Purpose
- Adds a narrowly scoped server-side RPC used only to complete the requested K4 source-text import when the local service-role credential is unavailable.
- Accepts one JSON object at a time and writes only `source_text` content with `content_status = source_only`.
- Preserves each supplied safety review status and rejects all other content kinds.

2. Security
- The function runs with owner privileges and uses a fixed search path.
- Anonymous execution is granted temporarily so the local import client can call it.
- The grant must be revoked immediately after the import verification.
- No application tables, existing rows, Formal Master entries, or source mappings are deleted.
*/

CREATE OR REPLACE FUNCTION public.import_k4_source_content(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id text := payload->>'master_id';
  v_entry_id uuid;
  v_kind text := COALESCE(payload->>'content_kind', '');
  v_language text := COALESCE(payload->>'language', 'ja');
  v_content text := payload->>'content';
  v_safety text := COALESCE(payload->>'safety_review_status', 'not_reviewed');
  v_sections jsonb := COALESCE(payload->'sections', '[]'::jsonb);
  v_safety_sensitive boolean;
  v_section_count integer := 0;
BEGIN
  IF v_master_id IS NULL OR v_content IS NULL OR btrim(v_content) = '' THEN
    RAISE EXCEPTION 'invalid K4 payload';
  END IF;
  IF v_kind <> 'source_text' THEN
    RAISE EXCEPTION 'only source_text is allowed';
  END IF;
  IF v_safety NOT IN ('not_reviewed', 'review_required', 'reviewed_safe', 'restricted') THEN
    RAISE EXCEPTION 'invalid safety status';
  END IF;

  SELECT id, safety_sensitive INTO v_entry_id, v_safety_sensitive
  FROM knowledge_entries WHERE master_id = v_master_id;
  IF v_entry_id IS NULL THEN
    RAISE EXCEPTION 'master_id not found';
  END IF;
  IF v_safety_sensitive AND v_safety NOT IN ('review_required', 'restricted') THEN
    v_safety := 'review_required';
  END IF;

  INSERT INTO knowledge_contents (
    knowledge_entry_id, content_kind, language, content, content_status, safety_review_status
  ) VALUES (
    v_entry_id, v_kind, v_language, v_content, 'source_only', v_safety
  )
  ON CONFLICT (knowledge_entry_id, content_kind, language) DO UPDATE SET
    content = EXCLUDED.content,
    content_status = EXCLUDED.content_status,
    safety_review_status = EXCLUDED.safety_review_status,
    updated_at = now();

  DELETE FROM knowledge_source_sections WHERE knowledge_entry_id = v_entry_id;

  INSERT INTO knowledge_source_sections (
    knowledge_entry_id, section_type, heading, body, source_order
  )
  SELECT
    v_entry_id,
    COALESCE(s->>'section_type', 'other'),
    s->>'heading',
    s->>'body',
    COALESCE((s->>'source_order')::integer, ordinality::integer)
  FROM jsonb_array_elements(v_sections) WITH ORDINALITY AS x(s, ordinality);

  SELECT count(*)::integer INTO v_section_count
  FROM knowledge_source_sections WHERE knowledge_entry_id = v_entry_id;

  RETURN jsonb_build_object('master_id', v_master_id, 'sections', v_section_count, 'content_status', 'source_only', 'safety_review_status', v_safety);
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_k4_source_content(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.import_k4_source_content(jsonb) TO authenticated;