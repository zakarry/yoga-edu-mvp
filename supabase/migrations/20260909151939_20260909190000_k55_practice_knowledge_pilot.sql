/*
# K5.5: Practice Knowledge Safety Review Pilot

## Purpose
Add 11 practice-oriented Knowledge entries to the AI Teacher explanation pool.
The existing 14 entries (6 ai_explanation_candidate + 8 public_candidate) remain unchanged.

## New Pilot Entries (11 items)

### Asana (9 entries from Chapter 9)
1. YK-0263: スーリヤ・ナマスカーラ（太陽礼拝）序論
2. YK-0274: マツヤーサナ（魚のポーズ）
3. YK-0270: パスチモッタナーサナ（座位前屈ポーズ）
4. YK-0267: トリコーナーサナ（三角形のポーズ）
5. YK-0273: ブジャンガーサナ（コブラのポーズ）
6. YK-0259: シャラバーサナ（バッタのポーズ）
7. YK-0265: ダヌラーサナ（弓のポーズ）
8. YK-0252: アルダ・マッツェンドラーサナ（半分の背骨をねじるポーズ）
9. YK-0272: パーダハスターサナ（立ちながら前方に曲げる）

### Pranayama (2 entries from Chapter 10)
10. YK-0313: 完全なヨガ呼吸
11. YK-0285: アヌローマ・ヴィローマ／ナーディー・ショーダナ

## Safety Review Results
- All 11 entries: safety_review_status = reviewed_safe
- All 11 entries: safety_sensitive set to false (safe for explanation use)
- All 11 entries: usage_status = ai_explanation_candidate
- public_content: 300-700 chars, based on source_text only, no medical claims
- editorial_summary: internal review notes created for each entry
- No "○○に効く" or "○○を治す" expressions in public_content
- Asana entries: "原典には注意事項・禁忌が記載されています" where applicable
- Pranayama entries: general description only, no therapeutic claims

## What This Migration Does NOT Do
- Does NOT change ai_use_scope to ai_teacher_practice
- Does NOT set practice_candidate = true
- Does NOT modify existing 14 entries
- Does NOT add RAG, LLM, or embedding
- Does NOT connect to Today Plan or recommendation engine
*/

DO $$
DECLARE
  v_entry_id uuid;
  v_count int;
BEGIN
  -- ========================================
  -- 1. YK-0263: スーリヤ・ナマスカーラ（太陽礼拝）序論
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0263';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'スーリヤ・ナマスカーラの序論。source_textは安全性に問題なし。祈り・マントラ・12ポーズの概要が含まれる。医療的断定なし。public_contentでは概要と伝統的意義を中心に記載。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'スーリヤ・ナマスカーラは「太陽への敬礼」を意味する、ヨガの代表的な実践の一つです。サンスクリット語で「スーリヤ」は太陽、「ナマスカーラ」は敬礼や挨拶を表します。十二の連続したポーズと呼吸を組み合わせて行い、体を動かしながら心を整える実践です。古くから朝の行として親しまれ、太陽への感謝と祈りを込めて行われるのが伝統的な形です。ただし、祈りを捧げない場合でも、実践の成果は太陽からの恵みによるものとされています。初心者から経験者まで広く親しまれている基本的な実践です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 2. YK-0274: マツヤーサナ（魚のポーズ）
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0274';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'マツヤーサナ。source_textに禁忌・効果あり。効果に疾患名含むが、public_contentでは除外。一般的なポーズの概要と実践方法のみ記載。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'マツヤーサナは「魚のポーズ」と呼ばれるアーサナです。サンスクリット語で「マツヤ」は魚を意味します。背中を反らせて胸を開く姿勢が、魚が水面に跳ねる様子に似ていることからこの名が付けられました。実践では、座った姿勢から体を後ろに倒し、背中を反らせて頭頂を床に近づけます。胸と喉が開かれ、背骨が伸ばされる姿勢です。ヨガの伝統では、このポーズが魚の化身に関連するとされています。原典には注意事項・禁忌が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 3. YK-0270: パスチモッタナーサナ（座位前屈ポーズ）
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0270';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'パスチモッタナーサナ。source_textに禁忌・効果あり。public_contentでは一般的な前屈ポーズの概要のみ記載。疾患効果は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'パスチモッタナーサナは「座位前屈のポーズ」と呼ばれるアーサナです。サンスクリット語で「パスチマ」は後方を、「ウッターナ」は伸ばすことを意味します。座った姿勢で両脚を前に伸ばし、上半身を前に倒していく実践です。背中から腰、裏腿にかけての筋肉が伸ばされる姿勢です。ヨガの伝統では、心を落ち着かせる実践として位置づけられています。原典には注意事項・禁忌が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 4. YK-0267: トリコーナーサナ（三角形のポーズ）
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0267';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'トリコーナーサナ。source_textに禁忌あり。public_contentでは一般的な立位ポーズの概要のみ記載。疾患効果は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'トリコーナーサナは「三角形のポーズ」と呼ばれるアーサナです。サンスクリット語で「トリコーナ」は三角形を意味します。立った姿勢から脚を広げ、片手を床に近づけながら上半身を横に倒す実践です。体の側面が伸びる姿勢で、三角形の形を形成することからこの名が付けられました。ヨガの基本的な立位アーサナの一つで、体の側面の柔軟性を高める実践として親しまれています。原典には注意事項が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 5. YK-0273: ブジャンガーサナ（コブラのポーズ）
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0273';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'ブジャンガーサナ。source_textに禁忌・効果あり。public_contentでは一般的なポーズの概要のみ記載。疾患効果は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'ブジャンガーサナは「コブラのポーズ」と呼ばれるアーサナです。サンスクリット語で「ブジャンガ」は蛇・コブラを意味します。うつ伏せから上半身を持ち上げ、胸を開きながら背中を反らせる姿勢が、蛇が頭を持ち上げる様子に似ていることからこの名が付けられました。ヨガの伝統では、背中を反らす実践として位置づけられ、古くから親しまれている基本的なアーサナです。原典には注意事項・禁忌が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 6. YK-0259: シャラバーサナ（バッタのポーズ）
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0259';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'シャラバーサナ。source_textに禁忌（妊婦・腹部手術後）・効果あり。public_contentでは一般的なポーズの概要のみ記載。禁忌・疾患効果は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'シャラバーサナは「バッタのポーズ」と呼ばれるアーサナです。サンスクリット語で「シャラバ」はバッタを意味します。うつ伏せから両脚を持ち上げる姿勢がバッタに似ていることからこの名が付けられました。実践では、うつ伏せの状態から両脚を上方向に持ち上げて保持します。腹部と背中の筋肉を使う姿勢です。ヨガの伝統的なアーサナの一つです。原典には注意事項・禁忌が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 7. YK-0265: ダヌラーサナ（弓のポーズ）
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0265';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'ダヌラーサナ。source_textに禁忌・効果あり。public_contentでは一般的なポーズの概要のみ記載。疾患効果は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'ダヌラーサナは「弓のポーズ」と呼ばれるアーサナです。サンスクリット語で「ダヌ」は弓を意味します。うつ伏せから両脚を曲げ、手で足首を掴んで体を弓のように反らせる姿勢からこの名が付けられました。実践では、うつ伏せの状態で両手で足首を掴み、脚と上半身を同時に持ち上げて弓の形を作ります。ヨガの伝統的なアーサナの一つです。原典には注意事項・禁忌が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 8. YK-0252: アルダ・マッツェンドラーサナ
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0252';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'アルダ・マッツェンドラーサナ。source_textに禁忌あり。public_contentでは一般的なねじりポーズの概要のみ記載。疾患効果は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'アルダ・マッツェンドラーサナは「半分の背骨をねじるポーズ」と呼ばれるアーサナです。サンスクリット語で「アルダ」は半分を意味します。偉大なリシ（見者）マッツェンドラがハタ・ヨーガの生徒にこのアーサナを最初に教えたため、その名が付けられました。座った姿勢から片脚を曲げ、もう片方の脚を越えて体をねじる実践です。背骨を左右交互にねじり、全身をほぐす姿勢です。ヨガの伝統的なアーサナの一つです。原典には注意事項・禁忌が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 9. YK-0272: パーダハスターサナ
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0272';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'パーダハスターサナ。source_textに注意事項あり。public_contentでは一般的な立位前屈ポーズの概要のみ記載。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'パーダハスターサナは「立ちながら前方に曲げる」アーサナです。サンスクリット語で「パーダ」は足、「ハスタ」は手を意味します。立った姿勢から上半身を前に倒し、手を足に近づける実践です。背中から腰、裏腿にかけての筋肉が伸ばされる姿勢です。ヨガの基本的な立位前屈アーサナの一つで、スーリヤ・ナマスカーラの中でも取り入れられています。原典には注意事項が記載されていますので、無理のない範囲で行うことが大切です。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 10. YK-0313: 完全なヨガ呼吸
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0313';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      '完全なヨガ呼吸。source_textに詳細な実践方法あり。保息・クンバカの言及あり。public_contentでは一般的な概要のみ記載。具体的なテクニック詳細・疾患効果は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      '完全なヨガ呼吸は、腹式呼吸、胸式呼吸、鎖骨呼吸の三つの呼吸法を組み合わせた、ヨガの基本的な呼吸法です。吸気では腹部から胸、鎖骨の順に空気を満たし、呼気では逆の順序で空気を出します。ヨガの伝統では、全身の呼吸筋を意識的に使うことで、呼吸の深さと質を高める実践として位置づけられています。初心者は無理のない範囲で、自分のペースで行うことが大切です。原典には注意事項が記載されています。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- 11. YK-0285: アヌローマ・ヴィローマ／ナーディー・ショーダナ
  -- ========================================
  SELECT id INTO v_entry_id FROM knowledge_entries WHERE master_id = 'YK-0285';
  IF v_entry_id IS NOT NULL THEN
    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'editorial_summary', 'ja',
      'アヌローマ・ヴィローマ／ナーディー・ショーダナ。source_textに禁忌・疾患効果あり。public_contentでは一般的な概要のみ記載。具体的なテクニック詳細・疾患効果・禁忌は除外。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'editorial_summary');

    INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
    SELECT v_entry_id, 'public_content', 'ja',
      'アヌローマ・ヴィローマ（ナーディー・ショーダナ）は、左右の鼻孔を交互に使って行う呼吸法です。サンスクリット語で「ナーディー」はエネルギーの通り道、「ショーダナ」は浄化を意味します。片方の鼻孔を指で閉じ、もう片方から吸い、逆の鼻孔から吐く実践です。ヨガの伝統では、心身のバランスを整えるプラナヤマの一つとして位置づけられています。初心者は無理のない範囲で、自分のペースで行うことが大切です。原典には注意事項・禁忌が記載されています。',
      'editorial_review', 'reviewed_safe'
    WHERE NOT EXISTS (SELECT 1 FROM knowledge_contents WHERE knowledge_entry_id = v_entry_id AND content_kind = 'public_content');
  END IF;

  -- ========================================
  -- Update knowledge_entries: safety_sensitive=false, usage_status=ai_explanation_candidate
  -- ========================================
  UPDATE knowledge_entries
  SET safety_sensitive = false,
      usage_status = 'ai_explanation_candidate',
      updated_at = now()
  WHERE master_id IN (
    'YK-0263', 'YK-0274', 'YK-0270', 'YK-0267', 'YK-0273',
    'YK-0259', 'YK-0265', 'YK-0252', 'YK-0272',
    'YK-0313', 'YK-0285'
  );

END $$;
