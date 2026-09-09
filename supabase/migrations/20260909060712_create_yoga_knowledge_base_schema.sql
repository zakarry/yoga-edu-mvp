/*
# Yoga Knowledge Base Schema (PHASE K1)

## Purpose
Creates the shared knowledge foundation for the entire Yoga AI platform.
This schema will be used by: yoga zukan, breathing zukan, breathing manager exam,
yoga grade 3/2 exams, Pro Yoga, My AI Teacher, AI Guru, RAG, and LLM.

## New Tables (6)
1. knowledge_entries — Core knowledge items (asana, pranayama, philosophy, etc.)
2. knowledge_sources — Source tracking for each knowledge entry
3. knowledge_relations — Graph relationships between knowledge entries
4. practice_knowledge — Practice metadata for My AI Teacher (asana/pranayama/dhyana)
5. learning_mappings — Maps knowledge entries to learning programs (exams, certifications)
6. user_learning_progress — Tracks which knowledge entries a user has viewed/learned/completed

## Security (RLS)
- knowledge_entries, knowledge_sources, knowledge_relations, practice_knowledge, learning_mappings:
  Public SELECT on published entries only. No INSERT/UPDATE/DELETE for anon or authenticated.
- user_learning_progress: Owner-only CRUD (auth.uid() = user_id).

## Indexes
- slug, category, content_type, is_published on knowledge_entries
- entry_id, source_type on knowledge_sources
- from_entry_id, to_entry_id on knowledge_relations
- practice_type, is_ai_teacher_enabled on practice_knowledge
- learning_program on learning_mappings
- user_id on user_learning_progress

## Triggers
- updated_at auto-update on knowledge_entries, practice_knowledge, user_learning_progress

## Seed Data (5 test entries)
1. Tadasana (asana, yoga_zukan, practice_knowledge, ai_teacher_enabled)
2. Box Breathing (breathing, breathing_zukan, practice_type=pranayama, ai_teacher_enabled)
3. Dhyana Basic (dhyana, yoga_zukan, practice_knowledge)
4. Breath Fundamentals (breathing, breathing_manager, learning_mapping=breathing_manager)
5. Yoga Philosophy Basic (philosophy, yoga_zukan, no practice_knowledge)

## Notes
- Existing tables (profiles, diagnoses, practice_logs, pro_yoga_certifications) are NOT modified.
- user_learning_progress is learning history only, NOT certification status.
- general_purpose_tags are non-medical, non-diagnostic purpose tags only.
- Content is minimal placeholder text — not real curriculum content.
*/

-- ============================================================
-- 1. knowledge_entries
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_ja text NOT NULL,
  title_en text,
  category text NOT NULL,
  subcategory text,
  content_type text NOT NULL,
  summary text,
  content text,
  difficulty text,
  audience text[] DEFAULT '{}',
  language text NOT NULL DEFAULT 'ja',
  chapter_no integer,
  chapter_title text,
  item_no integer,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ke_category_check CHECK (
    category IN (
      'asana', 'pranayama', 'dhyana', 'philosophy',
      'anatomy', 'physiology', 'wellness', 'stress_management',
      'teaching', 'communication', 'breathing', 'yoga_history'
    )
  ),
  CONSTRAINT ke_content_type_check CHECK (
    content_type IN (
      'knowledge', 'practice', 'definition',
      'technique', 'concept', 'teaching'
    )
  )
);

-- ============================================================
-- 2. knowledge_sources
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_title text NOT NULL,
  source_section text,
  source_chapter text,
  source_url text,
  source_order integer,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ks_source_type_check CHECK (
    source_type IN (
      'yoga_zukan', 'breathing_zukan', 'breathing_manager',
      'pro_yoga', 'yoga_grade3', 'yoga_grade2', 'official_material'
    )
  )
);

-- ============================================================
-- 3. knowledge_relations
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entry_id uuid NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  to_entry_id uuid NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT kr_unique UNIQUE (from_entry_id, to_entry_id, relation_type),
  CONSTRAINT kr_relation_type_check CHECK (
    relation_type IN (
      'related_to', 'prerequisite', 'practice_of',
      'deeper_learning', 'breathing_related',
      'philosophy_related', 'exam_related'
    )
  )
);

-- ============================================================
-- 4. practice_knowledge
-- ============================================================

CREATE TABLE IF NOT EXISTS practice_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_entry_id uuid NOT NULL UNIQUE REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  practice_type text NOT NULL,
  practice_name text NOT NULL,
  default_minutes integer,
  difficulty text,
  beginner_friendly boolean NOT NULL DEFAULT false,
  general_purpose_tags text[] DEFAULT '{}',
  instruction_short text,
  instruction_normal text,
  instruction_detailed text,
  general_cautions text,
  is_ai_teacher_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pk_practice_type_check CHECK (
    practice_type IN ('asana', 'pranayama', 'dhyana')
  ),
  CONSTRAINT pk_default_minutes_check CHECK (default_minutes >= 0)
);

-- ============================================================
-- 5. learning_mappings
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_entry_id uuid NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  learning_program text NOT NULL,
  level text,
  chapter text,
  unit text,
  external_content_id text,
  external_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT lm_unique UNIQUE (knowledge_entry_id, learning_program),
  CONSTRAINT lm_learning_program_check CHECK (
    learning_program IN (
      'yoga_grade3', 'yoga_grade2', 'breathing_manager', 'pro_yoga'
    )
  )
);

-- ============================================================
-- 6. user_learning_progress
-- ============================================================

CREATE TABLE IF NOT EXISTS user_learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_entry_id uuid NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'viewed',
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ulp_status_check CHECK (
    status IN ('viewed', 'learning', 'completed')
  ),
  CONSTRAINT ulp_view_count_check CHECK (view_count >= 0),
  CONSTRAINT ulp_unique UNIQUE (user_id, knowledge_entry_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ke_slug ON knowledge_entries(slug);
CREATE INDEX IF NOT EXISTS idx_ke_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_ke_content_type ON knowledge_entries(content_type);
CREATE INDEX IF NOT EXISTS idx_ke_is_published ON knowledge_entries(is_published);

CREATE INDEX IF NOT EXISTS idx_ks_entry_id ON knowledge_sources(entry_id);
CREATE INDEX IF NOT EXISTS idx_ks_source_type ON knowledge_sources(source_type);

CREATE INDEX IF NOT EXISTS idx_kr_from_entry_id ON knowledge_relations(from_entry_id);
CREATE INDEX IF NOT EXISTS idx_kr_to_entry_id ON knowledge_relations(to_entry_id);

CREATE INDEX IF NOT EXISTS idx_pk_practice_type ON practice_knowledge(practice_type);
CREATE INDEX IF NOT EXISTS idx_pk_is_ai_teacher_enabled ON practice_knowledge(is_ai_teacher_enabled);

CREATE INDEX IF NOT EXISTS idx_lm_learning_program ON learning_mappings(learning_program);

CREATE INDEX IF NOT EXISTS idx_ulp_user_id ON user_learning_progress(user_id);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ke_updated_at ON knowledge_entries;
CREATE TRIGGER trg_ke_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pk_updated_at ON practice_knowledge;
CREATE TRIGGER trg_pk_updated_at
  BEFORE UPDATE ON practice_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ulp_updated_at ON user_learning_progress;
CREATE TRIGGER trg_ulp_updated_at
  BEFORE UPDATE ON user_learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS: knowledge_entries
-- ============================================================

ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_published_knowledge_entries" ON knowledge_entries;
CREATE POLICY "select_published_knowledge_entries"
ON knowledge_entries FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- ============================================================
-- RLS: knowledge_sources (parent must be published)
-- ============================================================

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_published_knowledge_sources" ON knowledge_sources;
CREATE POLICY "select_published_knowledge_sources"
ON knowledge_sources FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM knowledge_entries ke
    WHERE ke.id = knowledge_sources.entry_id
    AND ke.is_published = true
  )
);

-- ============================================================
-- RLS: knowledge_relations (both entries must be published)
-- ============================================================

ALTER TABLE knowledge_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_published_knowledge_relations" ON knowledge_relations;
CREATE POLICY "select_published_knowledge_relations"
ON knowledge_relations FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM knowledge_entries ke
    WHERE ke.id = knowledge_relations.from_entry_id
    AND ke.is_published = true
  )
  AND EXISTS (
    SELECT 1 FROM knowledge_entries ke
    WHERE ke.id = knowledge_relations.to_entry_id
    AND ke.is_published = true
  )
);

-- ============================================================
-- RLS: practice_knowledge (parent must be published)
-- ============================================================

ALTER TABLE practice_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_published_practice_knowledge" ON practice_knowledge;
CREATE POLICY "select_published_practice_knowledge"
ON practice_knowledge FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM knowledge_entries ke
    WHERE ke.id = practice_knowledge.knowledge_entry_id
    AND ke.is_published = true
  )
);

-- ============================================================
-- RLS: learning_mappings (parent must be published)
-- ============================================================

ALTER TABLE learning_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_published_learning_mappings" ON learning_mappings;
CREATE POLICY "select_published_learning_mappings"
ON learning_mappings FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM knowledge_entries ke
    WHERE ke.id = learning_mappings.knowledge_entry_id
    AND ke.is_published = true
  )
);

-- ============================================================
-- RLS: user_learning_progress (owner only)
-- ============================================================

ALTER TABLE user_learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_learning_progress" ON user_learning_progress;
CREATE POLICY "select_own_learning_progress"
ON user_learning_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_learning_progress" ON user_learning_progress;
CREATE POLICY "insert_own_learning_progress"
ON user_learning_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_learning_progress" ON user_learning_progress;
CREATE POLICY "update_own_learning_progress"
ON user_learning_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_learning_progress" ON user_learning_progress;
CREATE POLICY "delete_own_learning_progress"
ON user_learning_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================
-- SEED DATA (5 test entries)
-- ============================================================

-- 1. Tadasana
INSERT INTO knowledge_entries (slug, title_ja, title_en, category, content_type, summary, content, difficulty, audience, is_published)
VALUES (
  'tadasana',
  'ターダーサナ（山のポーズ）',
  'Tadasana (Mountain Pose)',
  'asana',
  'practice',
  '立位の基礎となるポーズ。全身のアライメントを整える。',
  '両足を揃え、重心を均等に配る。尾骨を下げ、頭頂を天に向ける。基礎的な立ちポーズ。',
  'beginner',
  ARRAY['beginner', 'foundation'],
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO knowledge_sources (entry_id, source_type, source_title, is_primary)
SELECT id, 'yoga_zukan', 'ヨガ図鑑', true
FROM knowledge_entries WHERE slug = 'tadasana'
ON CONFLICT DO NOTHING;

INSERT INTO practice_knowledge (knowledge_entry_id, practice_type, practice_name, default_minutes, difficulty, beginner_friendly, general_purpose_tags, instruction_short, instruction_normal, is_ai_teacher_enabled)
SELECT id, 'asana', 'ターダーサナ', 3, 'beginner', true,
  ARRAY['morning', 'foundation', 'gentle', 'beginner'],
  '両足を揃えて立ち、全身を伸ばす。',
  '両足を揃え、重心を均等に配る。尾骨を下げ、頭頂を天に向ける。5呼吸キープ。',
  true
FROM knowledge_entries WHERE slug = 'tadasana'
ON CONFLICT (knowledge_entry_id) DO NOTHING;

-- 2. Box Breathing
INSERT INTO knowledge_entries (slug, title_ja, title_en, category, content_type, summary, content, difficulty, audience, is_published)
VALUES (
  'box-breathing',
  'ボックス・ブレージング',
  'Box Breathing',
  'breathing',
  'technique',
  '4秒吸う・4秒止める・4秒吐く・4秒止めるを繰り返す呼吸法。',
  '4秒で吸う、4秒止める、4秒で吐く、4秒止める。これを繰り返すことで自律神経を整える。',
  'beginner',
  ARRAY['beginner', 'breath_focus'],
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO knowledge_sources (entry_id, source_type, source_title, is_primary)
SELECT id, 'breathing_zukan', '呼吸図鑑', true
FROM knowledge_entries WHERE slug = 'box-breathing'
ON CONFLICT DO NOTHING;

INSERT INTO practice_knowledge (knowledge_entry_id, practice_type, practice_name, default_minutes, difficulty, beginner_friendly, general_purpose_tags, instruction_short, instruction_normal, is_ai_teacher_enabled)
SELECT id, 'pranayama', 'ボックス・ブレージング', 2, 'beginner', true,
  ARRAY['short_session', 'breath_focus', 'beginner', 'evening'],
  '4秒吸う・4秒止める・4秒吐く・4秒止める。',
  '4秒で鼻から吸う。4秒止める。4秒で鼻から吐く。4秒止める。繰り返す。',
  true
FROM knowledge_entries WHERE slug = 'box-breathing'
ON CONFLICT (knowledge_entry_id) DO NOTHING;

-- 3. Dhyana Basic
INSERT INTO knowledge_entries (slug, title_ja, title_en, category, content_type, summary, content, difficulty, audience, is_published)
VALUES (
  'dhyana-basic',
  'ディアーナ（瞑想）基礎',
  'Dhyana Basic',
  'dhyana',
  'practice',
  '瞑想の基礎。呼吸に意識を向けるシンプルな練習。',
  '快適な座位をとり、呼吸の感覚に意識を向ける。思绪が浮かんでも判断せず、呼吸に戻る。',
  'beginner',
  ARRAY['beginner', 'meditation_focus'],
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO knowledge_sources (entry_id, source_type, source_title, is_primary)
SELECT id, 'yoga_zukan', 'ヨガ図鑑', true
FROM knowledge_entries WHERE slug = 'dhyana-basic'
ON CONFLICT DO NOTHING;

INSERT INTO practice_knowledge (knowledge_entry_id, practice_type, practice_name, default_minutes, difficulty, beginner_friendly, general_purpose_tags, instruction_short, instruction_normal, is_ai_teacher_enabled)
SELECT id, 'dhyana', 'ディアーナ基礎', 5, 'beginner', true,
  ARRAY['evening', 'meditation_focus', 'gentle', 'beginner'],
  '座位で呼吸に意識を向ける。',
  '快適な座位をとる。目を閉じ、呼吸の感覚に意識を向ける。思绪が浮かんでも判断せず呼吸に戻る。',
  true
FROM knowledge_entries WHERE slug = 'dhyana-basic'
ON CONFLICT (knowledge_entry_id) DO NOTHING;

-- 4. Breath Fundamentals
INSERT INTO knowledge_entries (slug, title_ja, title_en, category, content_type, summary, content, difficulty, audience, is_published)
VALUES (
  'breath-fundamentals',
  '呼吸の基礎',
  'Breath Fundamentals',
  'breathing',
  'knowledge',
  '呼吸の仕組みと基本的な考え方。',
  '呼吸は横隔膜等の筋肉によって行われる。鼻呼吸を基本とし、腹式呼吸を基礎とする。',
  'beginner',
  ARRAY['beginner', 'breath_focus', 'foundation'],
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO knowledge_sources (entry_id, source_type, source_title, is_primary)
SELECT id, 'breathing_manager', '呼吸マネージャー教材', true
FROM knowledge_entries WHERE slug = 'breath-fundamentals'
ON CONFLICT DO NOTHING;

INSERT INTO learning_mappings (knowledge_entry_id, learning_program, level, chapter)
SELECT id, 'breathing_manager', '基礎', '第1章'
FROM knowledge_entries WHERE slug = 'breath-fundamentals'
ON CONFLICT (knowledge_entry_id, learning_program) DO NOTHING;

-- 5. Yoga Philosophy Basic
INSERT INTO knowledge_entries (slug, title_ja, title_en, category, content_type, summary, content, difficulty, audience, is_published)
VALUES (
  'yoga-philosophy-basic',
  'ヨガ哲学の基礎',
  'Yoga Philosophy Basic',
  'philosophy',
  'concept',
  'ヨガの基本的な哲学的概念。',
  'ヨガは心身の調和を目指す実践。古代インドの哲学にルーツを持つ。',
  'beginner',
  ARRAY['beginner', 'foundation'],
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO knowledge_sources (entry_id, source_type, source_title, is_primary)
SELECT id, 'yoga_zukan', 'ヨガ図鑑', true
FROM knowledge_entries WHERE slug = 'yoga-philosophy-basic'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: knowledge_relations (test)
-- ============================================================

INSERT INTO knowledge_relations (from_entry_id, to_entry_id, relation_type)
SELECT ke1.id, ke2.id, 'breathing_related'
FROM knowledge_entries ke1, knowledge_entries ke2
WHERE ke1.slug = 'box-breathing' AND ke2.slug = 'breath-fundamentals'
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_relations (from_entry_id, to_entry_id, relation_type)
SELECT ke1.id, ke2.id, 'related_to'
FROM knowledge_entries ke1, knowledge_entries ke2
WHERE ke1.slug = 'tadasana' AND ke2.slug = 'yoga-philosophy-basic'
ON CONFLICT DO NOTHING;