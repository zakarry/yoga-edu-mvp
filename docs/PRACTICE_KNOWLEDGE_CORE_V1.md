# Practice & Knowledge Core v1.0 — 設計案（未実装）

## 現行監査
基準ac06d945、製品ソース変更なし。
- `poseCatalog.ts` → `poseLibrary.ts` はID/表示名/段階画像/Knowledge参照/具体的時間を変換。呼吸・瞑想catalogもPose型へadapter変換し、複数の名前aliasを持つ。例: 交替鼻呼吸aliasが腹式へ解決する箇所は監査残件で、正確性を検証せず「同一」としない。
- `MyAITeacherPage.tsx` がplan、guide、runtime、audio、Visual、完了保存を結合。山/猫牛は `AsanaClockRuntime` + `asanaClockTimeline`（wall clock＋mandatory/optional音声queue）。立ち木等は `asanaCueBuilder` + `PracticeAudioRuntime`（voice ended＋silence/phase）。同じtime値でも時間意味が異なる。
- 呼吸は `breathworkCatalog`/`breathworkCueBuilder`、瞑想は `meditationCatalog`/`meditationCueBuilder`。他にlegacy breathwork/meditation/surya経路も存在。古い数息観テストのSessionはmainにない。全種の実機等価性は未確認。
- `voiceGuide.ts` が音声file/ブラウザ音声を提供、`voiceGuide.ts` 内のasset key/URL管理とcatalog原稿、tree pronunciation JSON、字幕が複数箇所にある。treeのみ生成とfallbackの共通kanaが明示済み。他全音声の正読確認は未了。
- Knowledgeは `knowledgeResolver.ts`、`todayPlanKnowledgeService.ts`、`conversationKnowledge.ts` などで参照/検索され、practice catalogの `verified` とDBに実在する出典検証は別。DB総件数は今回照会しない。
- 既存テストは部分ごとにruntime mock/実file/browser実測に分かれる。単一時間意味/音声fixture/全経路に対する契約が未統一。

## コード内件数（本番Knowledge DBの件数ではない）
実import監査: ASANA定義12/active11/Knowledge verified表記6、BREATH定義7/active6/verified表記5、MEDITATION定義5/active5/verified表記2。verified表記を出典DB照会済みと扱わない。画像・音声・レビュー状態の充足率は追加棚卸しが必要。

## 推奨境界
1. `PracticeDefinition`（versioned stable practiceId、種別asana/breath/meditation、対象レベル、画像段階、左右/強度、Knowledge source IDと検証状態）。出典なしを捏造しない。既存ID/asset保持。
2. `GuideSequence`（cueId、displayText、speechText、assetKey/hash、Visual stage、side、phase、時間意味）。`instruction`/`transition`/`hold`/`breath-phase`/`completion`を区別。文字数推定で音声打切りしない。
3. `PracticeSessionController`（guide→ready→active→finishing→completed→record）。時間は `plannedHoldSec`、`remainingHoldSec`、`elapsedSessionSec`、`narrationElapsedSec` に分ける。左右の比較対象はhold、全実時間と混同しない。
4. runtime adapter: 現行clock/audio/呼吸/瞑想を包み、共通イベント（subtitle、visual、phase、remaining、voiceEnded、complete）を送る。初回から全部を一つのschedulerに置換しない。
5. `PronunciationRegistry` は生成/ブラウザfallbackに同じ読みを渡す。音声build時transcript/asset hashを記録し、人の試聴ステータスを独立保存。字幕を読みに合わせて不自然な表記へ改変しない。
6. `KnowledgeReference` はsource ID、採用根拠、検証/不足状態。LLM会話retrievalと実践の固定手順を混ぜず、実践手順はレビュー済みcontent。YK-0263/0267のcontext伝達はEngine専用契約。

Safety/Today ContextのGateはCore外側で解決し、最終startにも判定。Safety blockedならsession開始/音声/タイマー/保存を発火させない。Auth/MFA/DB/usage/Conversation EngineはCore移行の変更対象にしない。

## 段階計画と受入
Phase0（今回）: 監査・文書・既存suite接続・契約追加のみ。
Phase1（別PR/未承認）: 読取専用normalized adapterで現行出力とshadow比較。STEP2/6のpracticeId/順/時間、DEMO構成、asset/原稿の差分ゼロを確認。
Phase2: 1practiceずつcontroller adapter化、左右保持/stop/pause/音声末尾/字幕/Visual/実機390pxの等価性検証。元adapterを戻せる独立PR。計画時間と実時間の意図的差は表示仕様として固定。
Phase3: 全対象が実測等価になってから重複定義を削減。Content Expansionは別工程。

採用ゲート: Build/型/既存＋新契約PASS、Android/LINE実機（音声・映像・UI）、未開始/中止保存0/完了一度、Safety Gate、OAuth/Memory回帰、source/asset hash比較。成功証拠がない経路を旧実装から切り離さない。故障した既存テストは再現と根拠を残して移植し、PASS扱いで捨てない。

## 未決事項
実音声長と予定実践時間をUIでどう説明するか、全種のmetadata不足、Knowledge sourceの実在/審査、alias同義性、SpeechSynthesis端末差、既存音声全件の読み/品質、クラウド統合テスト環境。ユーザー合意前に勝手に動作変更しない。


## PR #17との整合（2026-10-10）
上のSession欠落は旧基準の監査履歴。最新main c4ffbccは数息観専用Sessionを復元済み。Coreでは `media_narration_then_silence` を独立契約とし、60秒録音のaudio.currentTime字幕/時計→ended→240秒静寂を保持する。汎用wall clockへ統合しない。
腹式呼吸はvoice ended後の4秒吸気/6秒呼気×6周、字幕とかな原稿の分離を維持。Androidの発音は未確認。
棚卸しと1実践ずつの移行/自動検品/実機ゲートは[段階計画](PRACTICE_CORE_IMPLEMENTATION_PLAN.md)に具体化。本書の採用は大規模runtime置換や新規アーサナ追加の承認を意味しない。
