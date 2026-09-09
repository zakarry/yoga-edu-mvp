-- K6.3: Safety Review Pilot for YK-0264 (タダーサナ) and YK-0277 (ヴルクシャーサナ)
-- Create safe public_content and editorial_summary based strictly on source_text
-- Exclude: medical contraindications, specific health claims, disease references
-- safety_sensitive remains true (source has contraindications)
-- usage_status upgraded to ai_explanation_candidate for both
-- safety_review_status set to reviewed_safe for the new public_content rows

-- YK-0264 タダーサナ: public_content
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'public_content', 'ja',
'タダーサナ（tāḍāsana）は、サンスクリット語で「ヤシの木」を意味するターダ（tāḍa）と「ポーズ」を意味するアーサナ（āsana）に由来する立位の基礎的なアーサナです。ヤシの木のようにまっすぐ伸びた姿勢が名前の由来となっています。実践では、床にしっかり足を置いて立ち、体側に両手をまっすぐ伸ばし、目の前の一点に意識を集中します。踵でバランスをとりながらつま先を上げ、5〜10秒間とどまった後、ゆっくりとつま先を床に戻します。両脇から胴体を持ち上げて胸を広げ、頭頂部が天井に平行になるように頭をまっすぐ保ちます。つま先を床に押しつけながら足首、ふくらはぎ、腿、腰の順に脚を持ち上げ、呼吸に意識を集中しながら1〜2分間ポーズを維持します。息を吸うときは息が脚から頭まで上昇するように、吐くときは頭から足へ伝わるように感じます。タダーサナは姿勢の改善、バランス感覚の向上、足首・膝・腰の関節の柔軟性、背骨の柔軟性を養う基礎的なポーズとして位置づけられています。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries WHERE master_id = 'YK-0264';

-- YK-0264 タダーサナ: editorial_summary
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'editorial_summary', 'ja',
'タダーサナ（tāḍāsana）は「ヤシの木」を意味するサンスクリット語に由来する立位の基礎的アーサナ。床にしっかり足を置いて立ち、体側に両手を伸ばし、踵でバランスをとりながらつま先を上げる。胴体を持ち上げて胸を広げ、頭をまっすぐ保ち、呼吸に意識を集中しながら1〜2分間維持する。姿勢改善、バランス感覚向上、関節と背骨の柔軟性を養うポーズとして位置づけられる。原典第9章アーサナ章に記述。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries WHERE master_id = 'YK-0264';

-- YK-0277 ヴルクシャーサナ: public_content
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'public_content', 'ja',
'ヴルクシャーサナ（vṛkṣāsana 木のポーズ）は、サンスクリット語で「木」を意味するヴルクシャ（vṛkṣa）に由来する立位のバランスアーサナです。しっかり根を張った木のように体が安定し、バランスが取れた優美な姿勢が特徴で、より難しいポーズの準備・ウォームアップとしても位置づけられています。実践では、タダーサナで立ち、片脚を持ち上げて反対側の腿の内側に足裏を置きます（膝の上には置かない）。両手を上に伸ばし、頭の上で手のひらを合わせ、深い呼吸をしながらできるだけ長くポーズを維持します。目の前の対象に視線を固定するとバランスを保ちやすくなります。ゆっくりと両腕を下ろし、足を床に戻した後、反対側も同様に行います。初心者は足を膝より低い位置に置いたり、バランスを取るために壁を利用したりしてもよいとされています。集中力を高めるため、行う前にしばらく呼吸をし、視線を固定することが推奨されています。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries WHERE master_id = 'YK-0277';

-- YK-0277 ヴルクシャーサナ: editorial_summary
INSERT INTO knowledge_contents (knowledge_entry_id, content_kind, language, content, content_status, safety_review_status)
SELECT id, 'editorial_summary', 'ja',
'ヴルクシャーサナ（vṛkṣāsana 木のポーズ）は「木」を意味するサンスクリット語に由来する立位バランスアーサナ。タダーサナで立ち、片脚を持ち上げて反対側の腿内側に足裏を置き、両手を頭上で合わせる。視線を固定してバランスを保ちながら深い呼吸で維持する。木のように安定した姿勢が特徴で、難しいポーズの準備としても位置づけられる。原典第9章アーサナ章に記述。',
'editorial_review', 'reviewed_safe'
FROM knowledge_entries WHERE master_id = 'YK-0277';

-- Upgrade usage_status to ai_explanation_candidate for both entries
-- safety_sensitive remains true (source has contraindications)
UPDATE knowledge_entries SET usage_status = 'ai_explanation_candidate' WHERE master_id = 'YK-0264';
UPDATE knowledge_entries SET usage_status = 'ai_explanation_candidate' WHERE master_id = 'YK-0277';
