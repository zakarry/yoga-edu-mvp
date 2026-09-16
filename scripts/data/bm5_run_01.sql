INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('physiology', '呼吸の仕組み', '換気・ガス交換・酸素運搬') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('cell_energy', '細胞とエネルギー', 'ATP・ミトコンドリア') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('co2', '二酸化炭素と呼吸調節', 'CO₂・pH・ボーア効果') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('observation', '呼吸の観察と記録', '測定・気づき・カルテ') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('yoga_theory', 'ヨガの考え方', 'プラーナ・プラーナーヤーマ') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('practice', '呼吸法の実践', '手順・時間・対象') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('safety', '注意事項と実践範囲', '中止条件・原稿の安全原則') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('sleep', '睡眠と休息', '睡眠・いびき・休息') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('mind', '自律神経と集中', '自律神経・脳・集中') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('conditioning', '運動と日常生活', '日常のコンディショニング') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('gut', '横隔膜・お腹・腸', '横隔膜・お腹・腸') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('lifestyle', '生活習慣と伝統的な健康観', '生活習慣と伝統的な健康観') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('performance', 'スポーツと本番の準備', 'スポーツと本番の準備') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES ('voice', '発声と呼吸', '発声と呼吸') ON CONFLICT (category_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH01', 'なぜ人は呼吸するのか', '呼吸マネージャー検定_教科書_第1部第1章.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH02', '呼吸器の構造', '呼吸マネージャー検定_教科書_第1部第２章_図版.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH03', '肺はどうやって動いているのか', '呼吸マネージャー検定_教科書_第1部第3章_図版.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH04', '酸素の旅', '呼吸マネージャー検定_教科書_第1部第4章‗図版.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH05', 'ミトコンドリアの世界', '呼吸マネージャー検定_教科書_第1部第５章_ミトコンドリアの世界.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH06', '呼吸と自律神経', '呼吸マネージャー検定_教科書_第2部第6章＿脳と呼吸.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH07', '呼吸と脳', '呼吸マネージャー検定_教科書_第2部第7章呼吸と脳.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH08', '呼吸と睡眠', '呼吸マネージャー検定_教科書_第2部第8章呼吸と睡眠.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH09', '呼吸とコンディショニング', '呼吸マネージャー検定_教科書_第3部第9章呼吸とコンディショニング.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH10', '腸と呼吸', '呼吸マネージャー検定_教科書_第3部第10章腸と呼吸.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH11', '呼吸とライフスタイル', '呼吸マネージャー検定_教科書_第3部第11章呼吸とライフスタイル.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH12', '呼吸とスポーツ', '呼吸マネージャー検定_教科書_第4部第12章呼吸とパフォーマンス.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH13', '呼吸と発声', '呼吸マネージャー検定_教科書_第4部第13章呼吸と発声.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH14', 'メンタルパフォーマンス', '呼吸マネージャー検定_教科書_第4部第14章メンタルパフォーマンス.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH15', 'ヨガとは', '呼吸マネージャー検定_教科書_第5部第15章ヨガとは.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH16', '八支則', '呼吸マネージャー検定_教科書_第5部第16章八支則.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES ('BM-CH17', 'プラーナーヤーマ', '呼吸マネージャー検定_教科書_第5部第17章プラーナーヤーマ.docx', '5.0', 'user_designated_official_material') ON CONFLICT (source_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P01', 'BM-CH01', NULL, '図版2〜3 左上・右上・右中段', '吸った空気は、生命のエネルギーに変わり、すべての細胞を支えています。
酸素は、赤血球に乗って全身を巡り、約37兆個の細胞の中にあるミトコンドリアでエネルギー（ATP）に変わります。
細胞の中のミトコンドリアが酸素と栄養を使って、エネルギー（ATP）をつくり出します。', '図版2〜3') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P02', 'BM-CH01', NULL, 'P4 4段階の見出しと説明', '①換気（Ventilation） 空気を肺へ出し入れする
②外呼吸（External Respiration） 肺胞と血液の間で酸素と二酸化炭素を交換する
③酸素運搬（Transport） 酸素を全身の細胞へ運ぶ
④内呼吸（Cellular Respiration） 細胞内で酸素を使ってエネルギーをつくる', 'P4') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P03', 'BM-CH01', NULL, 'P4 換気・外呼吸・酸素運搬の説明', '横隔膜が下がり肺がふくらむことで空気が入り、肺がしぼむことで空気が出ます。
肺胞のまわりには毛細血管が張りめぐらされています。酸素は血液へ、二酸化炭素は血液から肺胞へ移動します。
酸素は赤血球のヘモグロビンと結合して運ばれます。心臓のポンプ作用で全身に送り届けられ、約37兆個の細胞に届きます。', 'P4') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P04', 'BM-CH01', NULL, 'P5 上部・右側・下部ATP図', '酸素は糖質や脂質をATPへ変換するために必要な物質です。
脳・心臓・筋肉は絶えずATPを必要とします。
ATPは「生命のエネルギー通貨」
ATP → ADP＋P に分解
酸素と栄養素を使って再びATPにする（充電）', 'P5') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P05', 'BM-CH01', NULL, 'P6 上部・呼吸調節・pH・ボーア効果', '二酸化炭素（CO₂）は不要な老廃物ではありません。呼吸調節、血液pHの維持、ボーア効果など、生命維持に重要な役割を果たします。
血液中のCO₂濃度が上がると、脳の呼吸中枢が刺激され、「もっと息を吐き出そう」と指令を出します。
CO₂が減りすぎるとアルカリ性に、増えすぎると酸性に傾き、体の機能が低下します。
CO₂が増えると、ヘモグロビンは酸素を手放しやすくなり、組織へ酸素を届けやすくなります。', 'P6') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P06', 'BM-CH01', NULL, 'P6 左中央・左下', 'CO₂がなければ、呼吸のスイッチが入らず、私たちは呼吸ができなくなります。
ヨガや呼吸法は、CO₂耐性を高めることで心身を安定させます。', 'P6') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P07', 'BM-CH01', NULL, 'P7 上部・中央・下部の数値と一般化', '人体は約37兆個の細胞から構成されます。
細胞内のミトコンドリアは酸素を利用してATPを産生する「細胞の発電所」です。
1分間に体内でつくられるATPは、体重60kgの人で約2〜3kg分にもなります！
そのすべての細胞で、ミトコンドリアがATPをつくり続けています。
人の細胞は約37兆個（37,000億個）！', 'P7') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P08', 'BM-CH01', NULL, 'P8 呼吸数セルフチェックと評価表', '安静にして、1分間の呼吸数（呼吸回数）を数えましょう。
いつも通りの呼吸で数えましょう
8回以下：とても良い／リラックス・効率の良い呼吸
9〜12回：良い／健康的な範囲
13〜16回：やや多い／やや緊張・ストレスの可能性
17〜20回：多い／緊張・浅い呼吸の傾向
21回以上：非常に多い／強いストレス・疲労の可能性', 'P8') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P09', 'BM-CH01', NULL, 'P8 呼吸タイプ・鼻口・胸郭・横隔膜・肩の観察項目', 'あなたの呼吸の特徴をチェックしましょう。（複数チェック可）
肩だけ動く（肩呼吸タイプ）／胸だけ動く（胸式呼吸タイプ）／お腹だけ動く（腹式呼吸タイプ）／全体がバランスよく動く（全身呼吸タイプ）
ふだんの呼吸の通り方を確認しましょう。
胸の広がりを確認しましょう。
お腹の動きを確認しましょう。
肩や首に力が入っていませんか？', 'P8') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P10', 'BM-CH01', NULL, 'P9 中央の関連領域と呼吸カルテ欄', 'ストレス／睡眠／脳・集中力／心臓・血液循環／運動・パフォーマンス／食事・腸内環境／感情・メンタル／ヨガ・自律神経
今日の呼吸を記録してみよう（呼吸カルテの基本）
朝／昼／夜
呼吸数（1分間）／鼻呼吸（✓）／口呼吸（✓）／呼吸の深さ（1〜5）
睡眠の質／ストレス／疲労感／集中力／気分・活力
今日の出来事・気づき', 'P9') ON CONFLICT (passage_id) DO NOTHING;
INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES ('P11', 'BM-CH01', NULL, 'P10 宣言と記録の案内', '私は、今日から自分の呼吸を観察し、理解し、整え、一生付き合っていくことを誓います。
呼吸カルテに記録 毎日の呼吸と体調を記録
データが蓄積 グラフで見える化
AIが分析・アドバイス あなたに最適な改善提案', 'P10') ON CONFLICT (passage_id) DO NOTHING;