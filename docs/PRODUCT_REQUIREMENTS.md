# Yoga AI 確定仕様・保護条件

監査日: 2026-10-10。基準main: `ac06d9457418a509641c2296e79a44da7aeb47b3`。
優先根拠: 最新main + 明示的ユーザー指示 + PRの検証記録。以前の完成報告は範囲別証拠で判断する。本書の必須要件は製品全体の実測PASSを意味しない。

## 確定仕様

| ID | 必須条件 | 現行ソース・証拠 / 確認限界 |
| --- | --- | --- |
| AUD-01 | 表示「吐きます」、生成/代替音声「はきます」。正しい発音を試聴して確認 | `src/lib/voicePronunciation.json`、`scripts/generate-tree-pronunciation.ps1`、PR #13。tree-v3 WAV。人によるAndroid試聴は未確認 |
| TIME-01 | 案内中は「案内中」＋保持予定の数値、保持中は「保持中」＋残秒。説明終了後に保持開始 | `TreeHoldTimer.tsx`。30秒予定なら案内中0:30、保持開始0:30→0:29。数値を「準備・切替の案内」のみに戻さない |
| TIME-02 | 左右保持時間均等。案内・左右切替は保持を削らない | `asanaCueBuilder.ts`、`practiceAudioRuntime.ts`、PR #12/#13。1分設定の立ち木は左右各30秒＋案内。実時間は1分固定ではない |
| AUD-02 | 音声末尾まで再生、次音声と重ねない。字幕・Visual・タイマーを同じ実践位置へ同期 | 音声endedを待つ。実ファイル再生記録 `tree-audio-real-playback.json`。Android/LINE全端末を保証した証拠ではない |
| DEMO-01 | event-demo着地→デモCTA→山のお手本→手動実践開始。お手本到達で自動開始しない。既存進捗・完了導線を維持 | 現行 `getEventDemoPoses()` は山/猫と牛/子供のポーズ、各1分。古い会話のBox/瞑想4〜5件構成を勝手に復元しない。実画面の再受入は変更時に必要 |
| LINE-01 | 会場の主入口は公式LINE @159ppbisの既存QR。LINE友だち追加≠Web会員登録 | 完了導線 `https://line.me/R/ti/p/%40159ppbis`。リッチメニューのLIFF URLは保持。`line.me/R/`単独の誤リンクへ戻さない |
| PRO-01 | 学びのPro Yogaリンクは他項目同様左寄せ/下線。390pxでラベル・見出し・本文が切れず横はみ出しなし | PR #14、`ProYogaPage.tsx`/scoped CSS。320/390px既存検証。資格説明は公式リンク `https://proyogakentei.com/` を維持 |
| PRO-02 | 公開ページでMVP/バッジ風UI等の内部文言、未確定の検索優遇・イベント優遇を約束しない | PR #14。資格表示は確定取得statusのみ、非取得へGold等を誤表示しない（PR #11） |
| DIAG-01 | 通常診断結果は次の推奨行動を主CTAとして示す。通常版にDEMO掲載を本物の推薦として混ぜない | PR #11診断CTA、既存directoryVisibility。DEMO時はサンプル表記。診断・DBを今回変更しない |
| SAFE-01 | Current-turn Safety → Intent → Repair → Knowledge → General Conversation | AI先生v2.2。「違う、胸が痛い」はSafetyがRepairに優先し通常LLM0。予防・一般知識と現在症状を区別。YK-0263太陽礼拝/YK-0267側面。実LLM品質は専用受入で確認 |
| DATA-01 | 既存会員、先生設定、許可Memory、実践記録を削除/推測で上書きしない。未開始/中止の実践を保存しない、同session二重保存なし | クラウド/OAuth実測が必要。先生永続化PR #10はDraftであり、mainへ反映済みと扱わない |
| UI-01 | タイマー・CTA・画像がスマホで切れずbottom navに重要操作が隠れない | 390pxを最低確認幅。音声・時刻やSSRテストだけではレイアウトPASSにしない |

## 変更禁止境界
本タスクでは製品コードを変更しない。AI先生、Auth/Google/LINE、MFA、Super Admin/Admin、会員データ、DB/RLS、DEMO分離、カメラ、myYOGAカルテ、図鑑、STEP1〜5、今日のヨガ、実践AI先生に無関係な差分を混ぜない。
正式ドメインyogai.net、緊急bolt.host、MX/TXT/DKIM等も維持。production/preview Edge再deploy、DB Claim/Change/Restartは今回対象外。

## 改善予定（確定実装と混同しない）
先生設定永続化・対話UI・本人講師登録編集はPR #10のレビュー/実OAuth残件を含む。共通Coreは[設計案](PRACTICE_KNOWLEDGE_CORE_V1.md)であり未実装。Home4入口、時間起点Yoga、Personalized Home、Knowledge拡充はバックログ。自動テスト不足を仕様が存在しない理由にしない。

## 証拠リンク
- [PR #10 Draft](https://github.com/zakarry/yoga-edu-mvp/pull/10)
- [PR #11](https://github.com/zakarry/yoga-edu-mvp/pull/11)、[PR #12](https://github.com/zakarry/yoga-edu-mvp/pull/12)、[PR #13](https://github.com/zakarry/yoga-edu-mvp/pull/13)、[PR #14](https://github.com/zakarry/yoga-edu-mvp/pull/14)
- [数値/読み仕様](tree-pronunciation-timer.md)、[実ファイル音声記録](tree-audio-real-playback.json)、[診断/画像/資格](feedback-ui-release-20261008.md)

## 未確認
人がAndroid/LINEで聴いたtree-v3の「はきます」、実Google/LINE再ログインでの先生永続化、講師公開プロフィールの本人編集、全端末の音声同期、実LLM品質の最新再測定。過去の9月25日完成版と現在mainの全ソース同一性は確定できないため、履歴だけで退行原因を断定しない。
