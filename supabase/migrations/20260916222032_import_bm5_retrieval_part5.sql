INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP107', 'catalog', 'C020', '手足あたため呼吸', 'practice', '手足あたため呼吸は、教材では「冷えたときの体の観察」を目的に紹介されています。
1. 楽に座るか仰向けになる。両手をお腹に当てる。
2. 鼻から4秒静かに吸い、お腹・背中・肋骨のやさしい広がりを感じる。
3. 口または鼻から6秒吐き、肩・手・足の力を抜く。
原稿の目安：5〜10呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿には6秒が長い場合は4秒吸う・4秒吐くから始める例がある。 温まる効果は保証しない。', ARRAY['P099','P120']::text[], '[]'::jsonb, ARRAY['S004']::text[], ARRAY['手足あたため呼吸','冷えたときの体の観察','手足あたため呼吸とは？','手足あたため呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP108', 'catalog', 'C021', '運動後クールダウン呼吸', 'practice', '運動後クールダウン呼吸は、教材では「運動後に徐々に落ち着く」を目的に紹介されています。
1. 原稿では運動後に急に座り込まず、ゆっくり歩くところから始める。
2. 呼吸が荒い間は秒数に合わせない。
3. 少し落ち着いたら鼻から3〜4秒吸い、口から6秒吐く。
4. さらに落ち着いたら鼻呼吸に戻し、肩・胸・背中・脚の力を抜く。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：息苦しさ・めまい・胸の痛みがある場合は無理に続けず休む。 運動直後から一定の秒数を要求しない。', ARRAY['P100','P120']::text[], '[]'::jsonb, ARRAY['S004']::text[], ARRAY['運動後クールダウン呼吸','クールダウン呼吸','運動後に徐々に落ち着く','運動後クールダウン呼吸とは？','運動後クールダウン呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP109', 'catalog', 'C022', '横隔膜確認呼吸', 'practice', '横隔膜確認呼吸は、教材では「横隔膜に伴う動きへの気づき」を目的に紹介されています。
1. 仰向けになり、片手を胸、片手をお腹に置く。
2. 鼻から3〜4秒静かに吸い、お腹が少し広がるのを感じる。
3. 口または鼻から4〜6秒ゆっくり吐き、お腹が自然に戻るのを感じる。
原稿の目安：5〜10呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：お腹を無理に膨らませず、胸を押さえつけない。吐くときに強くへこませない。', ARRAY['P101','P106','P120']::text[], '[{"issue_id":"I027","rule":"見出し案：「食後の休息呼吸」。本文と第10章一覧に合わせる。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['横隔膜確認呼吸','横隔膜に伴う動きへの気づき','横隔膜確認呼吸とは？','横隔膜確認呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP110', 'catalog', 'C023', 'お腹の支え呼吸', 'practice', 'お腹の支え呼吸は、教材では「体幹の支えへの気づき」を目的に紹介されています。
1. 背すじを軽く伸ばして座る。
2. 鼻から3〜4秒吸い、お腹と背中をやさしく広げる。
3. 口または鼻から4〜6秒吐き、お腹を薄くするよう意識する。
4. 強く締めすぎず、息を止めずに姿勢を保つ。
原稿の目安：5呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P102','P106','P120']::text[], '[{"issue_id":"I027","rule":"見出し案：「食後の休息呼吸」。本文と第10章一覧に合わせる。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['お腹の支え呼吸','体幹の支えへの気づき','お腹の支え呼吸とは？','お腹の支え呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP111', 'catalog', 'C024', 'お腹ゆるめ呼吸', 'practice', 'お腹ゆるめ呼吸は、教材では「お腹まわりの緊張への気づき」を目的に紹介されています。
1. 楽に座るか仰向けになり、手をお腹に当てる。
2. 鼻から3〜4秒静かに吸う。
3. 口または鼻から6秒ほどかけて吐き、お腹の力を抜く。
4. みぞおち・下腹部・腰まわりをゆるめる。
原稿の目安：5〜10呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P103','P106','P120']::text[], '[{"issue_id":"I027","rule":"見出し案：「食後の休息呼吸」。本文と第10章一覧に合わせる。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['お腹ゆるめ呼吸','お腹まわりの緊張への気づき','お腹ゆるめ呼吸とは？','お腹ゆるめ呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP112', 'catalog', 'C025', '食前の整え呼吸', 'practice', '食前の整え呼吸は、教材では「食事に入る準備」を目的に紹介されています。
1. 食べる前に姿勢を整え、肩・あご・みぞおちの力を抜く。
2. 鼻から3〜4秒ゆっくり吸い、口または鼻から5〜6秒長く吐く。
3. 3呼吸してから食べ始め、最初の一口をゆっくり噛む。
原稿の目安：3呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P104','P106','P120']::text[], '[{"issue_id":"I027","rule":"見出し案：「食後の休息呼吸」。本文と第10章一覧に合わせる。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['食前の整え呼吸','食事に入る準備','食前の整え呼吸とは？','食前の整え呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP113', 'catalog', 'C026', '食後の休息呼吸', 'practice', '食後の休息呼吸は、教材では「食後の休息」を目的に紹介されています。
1. 食後すぐに強い運動をせず、背中を丸めすぎない楽な姿勢で座る。
2. お腹を締めつけない。鼻から3〜4秒静かに吸う。
3. 口または鼻から5〜6秒ゆっくり吐く。
原稿の目安：3〜5呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：食後に無理に深く吸わず、お腹がいっぱいのときはやさしく吐く。', ARRAY['P105','P106','P120']::text[], '[{"issue_id":"I027","rule":"見出し案：「食後の休息呼吸」。本文と第10章一覧に合わせる。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['食後の休息呼吸','食後の休息','食後の休息呼吸とは？','食後の休息呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP114', 'catalog', 'C027', '本番前リセット呼吸', 'practice', '本番前リセット呼吸は、教材では「本番前の準備」を目的に紹介されています。
1. 足裏を床につけ、背すじを軽く伸ばす。
2. 目線を一点に置き、鼻から3〜4秒吸う。
3. 口または鼻から6秒吐き、肩・あご・手の力を抜く。
4. 最後に自分にかける短い言葉を決める。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：緊張をゼロにすることや、眠くなるほど脱力することを目的にしない。', ARRAY['P107','P117','P227']::text[], '[{"issue_id":"I029","rule":"第4部導入の基本手順と第14章の場面別変種を別表示する。秒数・吐き方を混ぜない。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['本番前リセット呼吸','本番前の準備','本番前リセット呼吸とは？','本番前リセット呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP115', 'catalog', 'C028', '切り替え呼吸', 'practice', '切り替え呼吸は、教材では「次の行動へ戻る」を目的に紹介されています。
1. ミスや焦りに気づく。
2. 肩を一度下げ、鼻または口から短く吸う。
3. 口または鼻から長めに吐く。
4. 次にやることを一つだけ決める。
原稿の目安：1呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P108','P118']::text[], '[{"issue_id":"I029","rule":"第4部導入の基本手順と第14章の場面別変種を別表示する。秒数・吐き方を混ぜない。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['切り替え呼吸','次の行動へ戻る','切り替え呼吸とは？','切り替え呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP116', 'catalog', 'C029', '動作リズム呼吸', 'practice', '動作リズム呼吸は、教材では「動作と呼吸の関係を学ぶ」を目的に紹介されています。
詳細手順や個別条件の確認が必要なため、概要の紹介に限定します。
注意：競技によって条件が異なる。特に水中動作へ日常の呼吸手順を自動適用しない。', ARRAY['P109','P227']::text[], '[{"issue_id":"I029","rule":"第4部導入の基本手順と第14章の場面別変種を別表示する。秒数・吐き方を混ぜない。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['動作リズム呼吸','動作と呼吸の関係を学ぶ','動作リズム呼吸とは？','動作リズム呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP117', 'catalog', 'C030', '力発揮呼吸', 'practice', '力発揮呼吸は、教材では「力を出す場面の呼吸を学ぶ」を目的に紹介されています。
詳細手順や個別条件の確認が必要なため、概要の紹介に限定します。
注意：高負荷運動・一時的保息の個別適用は未審査。一般向けの筋力トレーニング処方には使わない。', ARRAY['P110']::text[], '[{"issue_id":"I029","rule":"第4部導入の基本手順と第14章の場面別変種を別表示する。秒数・吐き方を混ぜない。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['力発揮呼吸','力を出す場面の呼吸を学ぶ','力発揮呼吸とは？','力発揮呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP118', 'catalog', 'C031', '声の支え呼吸', 'practice', '声の支え呼吸は、教材では「発声の準備」を目的に紹介されています。
1. 背すじを軽く伸ばす。
2. 鼻から3〜4秒吸い、お腹と背中が軽く広がるのを感じる。
3. 「スー」と細く吐き、お腹を強く固めず支える。
原稿の目安：5回
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P111']::text[], '[]'::jsonb, ARRAY['S003','S004']::text[], ARRAY['声の支え呼吸','発声の準備','声の支え呼吸とは？','声の支え呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP119', 'catalog', 'C032', '発声前ウォームアップ呼吸', 'practice', '発声前ウォームアップ呼吸は、教材では「声を出す前の準備」を目的に紹介されています。
1. 背すじを軽く伸ばし、肩・あご・舌の力を抜く。
2. 鼻から3〜4秒吸い、口から細く長く吐く。
3. 軽くハミングし、リップロールを短く行う。
4. 声を出す前にもう一度呼吸を整える。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P112','P113','P227']::text[], '[{"issue_id":"I028","rule":"13-4の2図版は両方を保存する。正式掲載に使う1点を選び、もう1点は旧案として区別する。"}]'::jsonb, ARRAY['S003','S004']::text[], ARRAY['発声前ウォームアップ呼吸','声を出す前の準備','発声前ウォームアップ呼吸とは？','発声前ウォームアップ呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP120', 'catalog', 'C033', 'ロングトーン練習', 'practice', 'ロングトーン練習は、教材では「発声の補助練習」を目的に紹介されています。
1. 鼻から軽く吸う。
2. 楽な高さで声を出し、声を大きくしすぎない。
3. 息がなくなる前に終え、喉が苦しくなる前に休む。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：最長時間を競う練習にしない。', ARRAY['P114']::text[], '[{"issue_id":"I028","rule":"13-4の2図版は両方を保存する。正式掲載に使う1点を選び、もう1点は旧案として区別する。"}]'::jsonb, ARRAY['S003','S004']::text[], ARRAY['ロングトーン練習','発声の補助練習','ロングトーン練習とは？','ロングトーン練習の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP121', 'catalog', 'C034', '1分間6呼吸（概要）', 'practice', '1分間6呼吸（概要）は、教材では「自律神経を整える目的の例として一覧に掲載」を目的に紹介されています。
詳細手順や個別条件の確認が必要なため、概要の紹介に限定します。
注意：名称から5秒吸い5秒吐く等の比率を推定しない。 対象者・吸気呼気比・保息の有無はこの一覧に未記載。', ARRAY['P205']::text[], '[]'::jsonb, ARRAY['S002','S004']::text[], ARRAY['1分間6呼吸（概要）','毎分6呼吸','毎分6回','呼吸回数','1分間6呼吸とは？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;