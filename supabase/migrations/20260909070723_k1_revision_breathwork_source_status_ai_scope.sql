/*
# PHASE K1 追加修正: practice_type拡張, source_status, ai_use_scope, 整合性担保

## 変更内容

### 1. practice_knowledge.practice_type に breathwork を追加
- 許可値: asana, pranayama, breathwork, dhyana
- Box Breathing等の一般breathworkと伝統的Pranayamaを区別

### 2. knowledge_sources に source_status 追加
- source_status text NOT NULL DEFAULT 'checked'
- CHECK: checked, final, review_required, draft

### 3. knowledge_entries に ai_use_scope 追加
- ai_use_scope text NOT NULL DEFAULT 'reference_only'
- CHECK: reference_only, ai_teacher_explanation, ai_teacher_practice, teacher_education, guru_future
- Knowledge公開状態とAI Teacher実践推薦可否を別管理

### 4. ai_teacher_enabled整合性
- is_ai_teacher_enabled = true は ai_use_scope = 'ai_teacher_practice' のentryのみ
- DB CHECK制約では親テーブルの値を参照できないため、TRIGGERで整合性を担保
- practice_knowledgeのINSERT/UPDATE時に、親entryのai_use_scopeを検証

### 5. テストseed修正
- Box Breathing: practice_type = 'breathwork' に変更（pranayamaから）
- Tadasana, Dhyana Basic: ai_use_scope = 'ai_teacher_practice' に設定
- Box Breathing: ai_use_scope = 'ai_teacher_practice' に設定

## Notes
- 既存テーブルの他の列・制約は変更しない
- 既存migrationは書き換えない
*/

-- ============================================================
-- 1. practice_knowledge: practice_type に breathwork 追加
-- ============================================================

ALTER TABLE practice_knowledge
  DROP CONSTRAINT IF EXISTS pk_practice_type_check;

ALTER TABLE practice_knowledge
  ADD CONSTRAINT pk_practice_type_check CHECK (
    practice_type IN ('asana', 'pranayama', 'breathwork', 'dhyana')
  );

-- ============================================================
-- 2. knowledge_sources: source_status 追加
-- ============================================================

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS source_status text NOT NULL DEFAULT 'checked';

ALTER TABLE knowledge_sources
  DROP CONSTRAINT IF EXISTS ks_source_status_check;

ALTER TABLE knowledge_sources
  ADD CONSTRAINT ks_source_status_check CHECK (
    source_status IN ('checked', 'final', 'review_required', 'draft')
  );

-- ============================================================
-- 3. knowledge_entries: ai_use_scope 追加
-- ============================================================

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS ai_use_scope text NOT NULL DEFAULT 'reference_only';

ALTER TABLE knowledge_entries
  DROP CONSTRAINT IF EXISTS ke_ai_use_scope_check;

ALTER TABLE knowledge_entries
  ADD CONSTRAINT ke_ai_use_scope_check CHECK (
    ai_use_scope IN (
      'reference_only',
      'ai_teacher_explanation',
      'ai_teacher_practice',
      'teacher_education',
      'guru_future'
    )
  );

-- ============================================================
-- 4. 整合性TRIGGER: practice_knowledge.is_ai_teacher_enabled
--    親entryのai_use_scope = 'ai_teacher_practice' のみtrueを許可
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_ai_teacher_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_scope text;
BEGIN
  SELECT ke.ai_use_scope INTO parent_scope
  FROM knowledge_entries ke
  WHERE ke.id = NEW.knowledge_entry_id;

  IF NEW.is_ai_teacher_enabled = true AND parent_scope IS DISTINCT FROM 'ai_teacher_practice' THEN
    RAISE EXCEPTION
      'is_ai_teacher_enabled can only be true when parent entry ai_use_scope = ''ai_teacher_practice'' (current: %)',
      COALESCE(parent_scope, 'NULL');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pk_ai_teacher_scope ON practice_knowledge;
CREATE TRIGGER trg_pk_ai_teacher_scope
  BEFORE INSERT OR UPDATE OF is_ai_teacher_enabled, knowledge_entry_id ON practice_knowledge
  FOR EACH ROW EXECUTE FUNCTION enforce_ai_teacher_scope();

-- ============================================================
-- 5. seed修正: Box Breathing practice_type → breathwork
--    ai_use_scope設定
-- ============================================================

-- Box Breathing: practice_type を breathwork に更新
UPDATE practice_knowledge
SET practice_type = 'breathwork'
WHERE knowledge_entry_id = (
  SELECT id FROM knowledge_entries WHERE slug = 'box-breathing'
)
AND practice_type = 'pranayama';

-- ai_use_scope設定: Tadasana, Box Breathing, Dhyana Basic
UPDATE knowledge_entries
SET ai_use_scope = 'ai_teacher_practice'
WHERE slug IN ('tadasana', 'box-breathing', 'dhyana-basic');
