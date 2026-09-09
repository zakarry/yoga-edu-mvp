/*
# K5.5: Complete safety-review status for existing pilot content

## Purpose
The four pilot entries already had approved-looking public_content and editorial_summary rows,
but those rows were still marked `not_reviewed`. This migration records the completed review
for explanation use without changing their text.

## Updated Entries
- YK-0312: 初心者の簡単な瞑想技法
- YK-0316: 瞑想の概念
- YK-0317: 胸郭または胸式呼吸
- YK-0318: 腹式呼吸

## Updated Content Kinds
- `editorial_summary`: safety_review_status -> reviewed_safe
- `public_content`: safety_review_status -> reviewed_safe

## Unchanged
- `source_text` rows remain unchanged and remain source-only.
- No usage scope is expanded to ai_teacher_practice.
- No practice recommendation, Today Plan, RAG, embedding, or LLM behavior is added.
*/

UPDATE knowledge_contents
SET safety_review_status = 'reviewed_safe',
    updated_at = now()
WHERE content_kind IN ('editorial_summary', 'public_content')
  AND knowledge_entry_id IN (
    SELECT id
    FROM knowledge_entries
    WHERE master_id IN ('YK-0312', 'YK-0316', 'YK-0317', 'YK-0318')
  );
