2. 鼻から自然に吸い、鼻または口から吸うより長く吐く。
3. 3秒吸う・5秒吐く、または4秒吸う・6秒吐くという教材の例を使う。
原稿の目安：5〜10呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。', ARRAY['P24','P25','P26','P081','P116','P120','P175','P187','P188','P227','P205']::text[], '[{"issue_id":"I008","rule":"引用するCYPの版・発行年・ページを明記する。シータリーの掲載を確認できるまでは「このCYPに明記」と書かない。"},{"issue_id":"I012","rule":"保息の長さや有無を変える場合は、別の変種として名称・手順・出典を記載する。確定前の手順は案内しない。"},{"issue_id":"I013","rule":"この教材では、睡眠・集中などに関連する学習テーマとして呼吸を紹介します。個人の改善を保証する表現は削る。"},{"issue_id":"I022","rule":"基本手順と図中の「自然な間」を別記する。記載のない固定保息や毎分回数へ換算しない。"},{"issue_id":"I029","rule":"第4部導入の基本手順と第14章の場面別変種を別表示する。秒数・吐き方を混ぜない。"},{"issue_id":"I043","rule":"引用欄に著者・資料名・発行年・個別URL・参照箇所を記載する。機関名だけの引用は根拠の確定に使わない。"},{"issue_id":"I044","rule":"等時間のボックス呼吸と導入図の不等時間例を別表示する。導入例の名称が決まるまで実践配信は保留する。"}]'::jsonb, ARRAY['S002','S004']::text[], ARRAY['長い呼気の呼吸','長く吐く呼吸','吐く息を長くする呼吸','休息','長い呼気の呼吸とは？','長い呼気の呼吸の注意点は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP096', 'catalog', 'C009', 'おやすみ呼吸', 'practice', 'おやすみ呼吸は、教材では「就寝前の準備として紹介」を目的に紹介されています。
1. 布団で仰向けになり、手を下腹部か肋骨の横に置く。
2. 鼻から自然に吸い、3秒吸う・5秒吐くを目安にする。
3. 深く吸おうと頑張らず、眠くなったら数えるのをやめる。
原稿の目安：5〜10呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。', ARRAY['P24','P25','P086','P119','P120','P205']::text[], '[{"issue_id":"I008","rule":"引用するCYPの版・発行年・ページを明記する。シータリーの掲載を確認できるまでは「このCYPに明記」と書かない。"},{"issue_id":"I012","rule":"保息の長さや有無を変える場合は、別の変種として名称・手順・出典を記載する。確定前の手順は案内しない。"},{"issue_id":"I013","rule":"この教材では、睡眠・集中などに関連する学習テーマとして呼吸を紹介します。個人の改善を保証する表現は削る。"}]'::jsonb, ARRAY['S002','S004']::text[], ARRAY['おやすみ呼吸','睡眠前呼吸','就寝前のリラックス呼吸','睡眠','おやすみ呼吸とは？','おやすみ呼吸の注意点は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP097', 'catalog', 'C010', '3分リカバリー呼吸', 'practice', '3分リカバリー呼吸は、教材では「回復・休息として紹介」を目的に紹介されています。
1. 楽に座り、肩・あご・みぞおちの力を抜く。
2. 鼻から3〜4秒かけて軽く吸う。
3. 口または鼻から6秒かけて細く長く吐く。
原稿の目安：3分
苦しさやめまいが出たら中止し、不調を押して続けません。', ARRAY['P24','P25','P087','P088','P089','P120']::text[], '[{"issue_id":"I008","rule":"引用するCYPの版・発行年・ページを明記する。シータリーの掲載を確認できるまでは「このCYPに明記」と書かない。"},{"issue_id":"I012","rule":"保息の長さや有無を変える場合は、別の変種として名称・手順・出典を記載する。確定前の手順は案内しない。"},{"issue_id":"I013","rule":"この教材では、睡眠・集中などに関連する学習テーマとして呼吸を紹介します。個人の改善を保証する表現は削る。"},{"issue_id":"I029","rule":"第4部導入の基本手順と第14章の場面別変種を別表示する。秒数・吐き方を混ぜない。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['3分リカバリー呼吸','三分リカバリー呼吸','回復','3分リカバリー呼吸とは？','3分リカバリー呼吸の注意点は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP098', 'catalog', 'C011', '呼吸カウント集中法', 'practice', '呼吸カウント集中法は、教材では「集中・注意を戻す」を目的に紹介されています。
1. 椅子に楽に座り、鼻から自然に呼吸する。
2. 吐く息で1、次の吐く息で2と数える。
3. 10まで数えたら1に戻る。
4. 数を忘れたら1から。考え事に気づいたら呼吸へ戻る。
原稿の目安：3〜5分、1日1〜3回
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P090','P197','P205']::text[], '[{"issue_id":"I045","rule":"図の順序案：吸って1 → 吐いて1 → 吸って2 → 吐いて2。3人目のラベルを本文に合わせる。"}]'::jsonb, ARRAY['S002','S004']::text[], ARRAY['呼吸カウント集中法','集中・注意を戻す','呼吸カウント集中法とは？','呼吸カウント集中法の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP099', 'catalog', 'C012', '脱力呼吸', 'practice', '脱力呼吸は、教材では「肩まわりの力みに気づく」を目的に紹介されています。
1. 座るか仰向けになる。
2. 肩を5秒すくめ、ストンと下ろす。
3. 鼻から4秒吸い、口をすぼめて8秒吐く。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿内の実施頻度表記に差があり、用量は未確定。', ARRAY['P091']::text[], '[{"issue_id":"I025","rule":"「7秒間、息を止めずにキープ」の意図が確定するまで、この手順の実践案内を保留する。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['脱力呼吸','肩まわりの力みに気づく','脱力呼吸とは？','脱力呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP100', 'catalog', 'C013', '肋骨ひらき呼吸', 'practice', '肋骨ひらき呼吸は、教材では「肋骨の動きを観察する」を目的に紹介されています。
1. 椅子に座り、両手を肋骨の横に当てる。
2. 鼻から吸い、肋骨が横に広がるのを感じる。
3. 鼻から吐き、自然に戻るのを感じる。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：胸を無理に持ち上げない。回数は独自に補完しない。', ARRAY['P092']::text[], '[{"issue_id":"I025","rule":"「7秒間、息を止めずにキープ」の意図が確定するまで、この手順の実践案内を保留する。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['肋骨ひらき呼吸','肋骨の動きを観察する','肋骨ひらき呼吸とは？','肋骨ひらき呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP101', 'catalog', 'C014', 'お腹＋肋骨呼吸', 'practice', 'お腹＋肋骨呼吸は、教材では「お腹と肋骨の動きを観察する」を目的に紹介されています。
1. 座り、お腹と肋骨に手を当てる。
2. 鼻から吸い、お腹と肋骨の動きを感じる。
3. 吐くときは両方がやさしく戻るのを感じる。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P093']::text[], '[{"issue_id":"I025","rule":"「7秒間、息を止めずにキープ」の意図が確定するまで、この手順の実践案内を保留する。"}]'::jsonb, ARRAY['S004']::text[], ARRAY['お腹＋肋骨呼吸','お腹と肋骨の動きを観察する','お腹＋肋骨呼吸とは？','お腹＋肋骨呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP102', 'catalog', 'C015', '就寝前のやさしい呼吸（第8章・保息なし）', 'practice', '就寝前のやさしい呼吸（第8章・保息なし）は、教材では「就寝前の休息」を目的に紹介されています。
1. 仰向けか横向きの楽な姿勢になる。
2. 鼻から4秒吸う。
3. 息を止めず、口から7〜8秒かけて吐く。
原稿の目安：4〜6回
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P094']::text[], '[{"issue_id":"I026","rule":"名称案：就寝前のやさしい呼吸（第8章・保息なし）。原図の4秒吸う・7〜8秒吐くを記録し、7秒の保息は追加しない。"}]'::jsonb, ARRAY['S002','S004']::text[], ARRAY['就寝前のやさしい呼吸（第8章・保息なし）','4-7-8呼吸のやさしい版','就寝前の休息','就寝前のやさしい呼吸（第8章・保息なし）とは？','就寝前のやさしい呼吸（第8章・保息なし）の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP103', 'catalog', 'C016', '体をゆるめる呼吸', 'practice', '体をゆるめる呼吸は、教材では「就寝前に力みに気づく」を目的に紹介されています。
1. 仰向けになる。
2. 吸うときに肋骨が少し広がるのを感じる。
3. 吐くときに肩・胸・お腹をゆるめ、心の中で「重い」「ゆるむ」と言う。
原稿の目安：約3分。原稿の目安は1呼吸5〜8秒。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P095','P205']::text[], '[]'::jsonb, ARRAY['S002','S004']::text[], ARRAY['体をゆるめる呼吸','就寝前に力みに気づく','体をゆるめる呼吸とは？','体をゆるめる呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP104', 'catalog', 'C017', '眠れない夜の呼吸観察', 'practice', '眠れない夜の呼吸観察は、教材では「呼吸を操作せず観察する」を目的に紹介されています。
1. 呼吸を変えようとせず、吸う息・吐く息に気づく。
2. 考え事に気づいたら「考えている」と気づき、呼吸へ戻る。
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P096','P205']::text[], '[]'::jsonb, ARRAY['S002','S004']::text[], ARRAY['眠れない夜の呼吸観察','呼吸を操作せず観察する','眠れない夜の呼吸観察とは？','眠れない夜の呼吸観察の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP105', 'catalog', 'C018', '姿勢リセット呼吸', 'practice', '姿勢リセット呼吸は、教材では「姿勢と力みの観察」を目的に紹介されています。
1. 背すじを軽く伸ばし、一度肩をすくめてストンと落とす。
2. 鼻から3〜4秒吸い、肋骨が横と後ろに広がるのを感じる。
3. 口または鼻から6秒吐き、首・肩・あごの力を抜く。
原稿の目安：5呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。 胸を無理に張るのではなく、背中を伸ばす。', ARRAY['P097','P120','P214']::text[], '[]'::jsonb, ARRAY['S004']::text[], ARRAY['姿勢リセット呼吸','肩こりリセット呼吸','姿勢と力みの観察','姿勢リセット呼吸とは？','姿勢リセット呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP106', 'catalog', 'C019', '朝の目覚め呼吸', 'practice', '朝の目覚め呼吸は、教材では「起床後の準備」を目的に紹介されています。
1. 座るか立って背すじを軽く伸ばす。
2. 肩・あご・お腹の力を抜き、鼻から3秒吸う。
3. 胸・背中・肋骨の広がりを感じ、口または鼻から4〜5秒吐く。
原稿の目安：3〜5呼吸
苦しさやめまいが出たら中止し、不調を押して続けません。
注意：原稿の時間は目安。個別の実施可否は未審査。', ARRAY['P098','P120']::text[], '[]'::jsonb, ARRAY['S004']::text[], ARRAY['朝の目覚め呼吸','目覚めの呼吸','起床後の準備','朝の目覚め呼吸とは？','朝の目覚め呼吸の手順は？']::text[], false, true) ON CONFLICT (retrieval_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES ('RP107', 'catalog', 'C020', '手足あたため呼吸', 'practice', '手足あたため呼吸は、教材では「冷えたときの体の観察」を目的に紹介されています。
1. 楽に座るか仰向けになる。両手をお腹に当てる。
2. 鼻から4秒静かに吸い、お腹・背中・肋骨のやさしい広がりを感じる。
3. 口または鼻から6秒吐き、肩・手・足の力を抜く。
原稿の目安：5〜10呼吸