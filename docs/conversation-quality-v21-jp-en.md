# JP / EN 実LLM比較

2026-09-26、同一mainコード・同一deploy済みproduction Edge・同じ非永続のMAYA設定で実行。各言語1セッション3往復。翻訳パイプラインの追加なし。実入力・回答全文と送信turnsは `conversation-quality-v21-live-results.json` と `conversation-quality-v21-acceptance.md` に記録。

| ターン | 日本語 | 英語 |
|---|---|---|
| 1 | アーサナを増やしたいです | I'd like to add more asanas. |
| 2 | 側面を伸ばすポーズがよいです | I'd like poses that stretch the sides of my body. |
| 3 | はい、ぜひ | Yes, please. |

| 観点 | 日本語 | 英語 |
|---|---|---|
| 文脈保持 | PASS。側面ストレッチ候補→承諾→三角のポーズ説明 | PASS。側面ストレッチ候補→承諾→門のポーズ説明 |
| 言語一貫性 | 3回答すべて日本語 | 3回答すべて英語 |
| Knowledge利用 | 3ターンすべて送信/解決Knowledge 0件 | 3ターンすべて送信/解決Knowledge 0件 |
| 回答品質 | 側角のポーズで「前の足の側面に肘を置き」という分かりにくい説明。CASE5はFAIL | 候補名と手順は文脈に沿うが、難易度や経験確認が十分とは言えない。Knowledgeに基づいた正確性は証明できない |

英語の方が常に高品質という結論は出せない。今回は各1セッションで、言語以外に選ばれたポーズ自体も違う。両言語とも実LLMは呼ばれたが、専門Knowledge取得0件という共通の不足がある。

補足：日本語の「太陽礼拝について教えてください」は、別セッションで安全一般論に誤分類され、実LLM/Knowledgeへ届かなかった（CASE7 FAIL）。言語モデルの日本語能力と決めつけず、まずフロントのintent/Safety分岐の問題として扱う。

英語3往復の後に「日本語でお願いします」を送った結果はCASE12に記録。ユーザーの永続的な指導言語設定は変更していない。
