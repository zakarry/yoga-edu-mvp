-- Add public_content for key breathwork/pranayama knowledge entries
-- YK-0029: プラーナーヤーマ (definition)
-- YK-0306: プラーナーヤーマ（呼吸法）への導入 (intro)
-- YK-0141: 呼吸器系 (respiratory system / lung mechanics)
-- YK-0319: 鎖骨呼吸 (clavicular breathing)
-- Also update usage_status to ai_explanation_candidate for these entries

-- First, update usage_status for entries that should be AI-teacher accessible
UPDATE knowledge_entries
SET usage_status = 'ai_explanation_candidate'
WHERE slug IN ('yk-0029', 'yk-0306', 'yk-0141', 'yk-0319')
AND usage_status NOT IN ('ai_explanation_candidate', 'public_candidate');

-- Insert public_content for YK-0029: プラーナーヤーマ
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'public_content', 'ja',
'プラーナーヤーマ（prāṇāyāma）とは、ヨガの八支の第4支に位置づけられる呼吸の制御（呼吸法）です。サンスクリット語で「プラーナ（prāṇā）」は生命力や生命エネルギーを、「アーヤーマ（āyāma）」は拡大・制御を意味します。パタンジャリの『ヨガ・スートラ』では、プラーナーヤーマを「呼吸を長く微かにして、通常の呼気と吸気の流れの調子を壊すこと」と定義しています。プラーナーヤーマは、吸気（プーラカ）、呼気（レーチャカ）、呼吸の保持（クンバカ）から構成されます。ヨガの伝統では、心身の浄化と集中の準備として重要視されています。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries
WHERE slug = 'yk-0029'
ON CONFLICT DO NOTHING;

-- Insert public_content for YK-0306: プラーナーヤーマ（呼吸法）への導入
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'public_content', 'ja',
'プラーナーヤーマ（呼吸法）への導入。呼吸は誕生時に始まり臨終時に止まる生命維持作用です。呼吸をしている間、生命維持に必要な酸素が全身の部位、器官、細胞に供給されます。プラーナーヤーマ（prāṇāyāma）は、呼吸を統制する秩序だった実践です。プラーナ（prāṇā）は「生命エネルギー」を、アーヤーマ（āyāma）は「統制・拡大」を意味します。呼吸の統制により、プラーナのエネルギーリズムを整え、健康な体と心を養うとされています。呼吸は吸気と呼気からなり、ヨガ経典ではそれぞれプーラカ（pūraka）、レーチャカ（recaka）と呼ばれます。呼吸の保持（クンバカ）も重要な要素です。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries
WHERE slug = 'yk-0306'
ON CONFLICT DO NOTHING;

-- Insert public_content for YK-0141: 呼吸器系
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'public_content', 'ja',
'呼吸器系は、体に酸素を取り入れ、体から二酸化炭素を排出する器官系です。呼吸器系には鼻、肺、気管などが含まれます。酸素は鼻や口から気管を通って体の中に入り、気管は左右の気管支に分かれて肺の中に入ります。気管支はさらに細かく枝分かれして細気管支となり、その先端には肺胞があります。酸素は肺胞で血管壁を通って血流に入り、二酸化炭素が肺から体外に排出されます。肺そのものには筋肉がなく、呼吸運動は横隔膜や肋間筋などの呼吸筋によって行われます。横隔膜が収縮して下がると胸腔が広がり空気が吸い込まれ、横隔膜が緩んで上がると空気が吐き出されます。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries
WHERE slug = 'yk-0141'
ON CONFLICT DO NOTHING;

-- Insert public_content for YK-0319: 鎖骨呼吸
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'public_content', 'ja',
'鎖骨呼吸は、鎖骨周辺の呼吸筋を使う呼吸法です。完全なヨガ呼吸の最上部の段階として位置づけられます。腹式呼吸で腹部を膨らませ、胸式呼吸で胸郭を広げた後、さらに鎖骨周辺まで空気を満たすようにします。吸気で鎖骨がわずかに上がり、呼気で下がるのを観察します。肩に力が入らないように注意しながら行います。初心者は無理のない範囲で、自分のペースで行うことが大切です。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries
WHERE slug = 'yk-0319'
ON CONFLICT DO NOTHING;

-- Also add knowledge_sources for the new public content entries
INSERT INTO knowledge_sources (entry_id, source_type, source_title, source_section, is_primary, source_status)
SELECT id, 'textbook', '呼吸マネージャー検定 第5版', NULL, true, 'final'
FROM knowledge_entries
WHERE slug = 'yk-0029'
AND NOT EXISTS (
  SELECT 1 FROM knowledge_sources ks WHERE ks.entry_id = knowledge_entries.id
);

INSERT INTO knowledge_sources (entry_id, source_type, source_title, source_section, is_primary, source_status)
SELECT id, 'textbook', '呼吸マネージャー検定 第5版', NULL, true, 'final'
FROM knowledge_entries
WHERE slug = 'yk-0306'
AND NOT EXISTS (
  SELECT 1 FROM knowledge_sources ks WHERE ks.entry_id = knowledge_entries.id
);

INSERT INTO knowledge_sources (entry_id, source_type, source_title, source_section, is_primary, source_status)
SELECT id, 'textbook', '呼吸マネージャー検定 第5版', NULL, true, 'final'
FROM knowledge_entries
WHERE slug = 'yk-0141'
AND NOT EXISTS (
  SELECT 1 FROM knowledge_sources ks WHERE ks.entry_id = knowledge_entries.id
);

INSERT INTO knowledge_sources (entry_id, source_type, source_title, source_section, is_primary, source_status)
SELECT id, 'textbook', '呼吸マネージャー検定 第5版', NULL, true, 'final'
FROM knowledge_entries
WHERE slug = 'yk-0319'
AND NOT EXISTS (
  SELECT 1 FROM knowledge_sources ks WHERE ks.entry_id = knowledge_entries.id
);