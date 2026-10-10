# Practice & Knowledge Core v1.0 — 共通仕様案と段階的実装計画

作成2026-10-10、基準main `a770b12910b346aba442433177b53daaada7d615`（PR #15正式採用）。
[AGENTS](../AGENTS.md)、[確定仕様](PRODUCT_REQUIREMENTS.md)、[回帰表](REGRESSION_TESTS.md)、[実ユーザー課題](USER_FEEDBACK_BACKLOG.md)を読んで作成。
本書は次工程用の仕様案であり、製品実装/動作変更の承認ではない。今回の差分は文書のみ。既存runtime・音声・タイマー・AI先生・認証・DBを変更しない。

## 0. 先に調査する未解決2件

| 課題 | 採用mainでの実測 | 次の調査・解決条件 |
| --- | --- | --- |
| Q-02 呼吸法 | `node scripts/test-breathwork.mjs` exit 1。54行: `abdominal should contain exhale cue` | 旧期待「鼻からゆっくり吐きます。」と現行builder「鼻からゆっくり吐いて、お腹がやさしく戻ります。」「鼻からゆっくり吐いて、力を抜きます。」の差を、変更履歴/承認/音声原稿/実assetで照合。後続未実行assertionも棚卸し。期待変更だけで解決しない |
| Q-03 数息観 | `node scripts/test-susokukan.mjs` exit 1。`src/lib/susokukanSession.ts` を解決できない | 旧テストは60秒の単一録音＋240秒静寂、media時刻字幕、pause/stop/restart/errorを要求。現行は `MeditationExperience`→`SusokukanExperience`→`buildMeditationCues`→`PracticeAudioRuntime`、画面時計はDate.now。実再生/字幕/完了と画面時計の不一致有無を追跡する。missing fileだけの問題と断定しない |

保存する証拠: 基準commit、両scriptのhash、各assertionの意図、どの製品経路を通るか、生成原稿/asset hash、時刻付きsubtitle/voice start/end/phase/remaining、実Android聴取結果。9月25日完成版との比較は該当版の実ソースを特定してから行う。
完了判定: 既存テストを削除/skip/緩和せず、製品の実挙動と仕様の齟齬を特定し、必要な修正を別PRで検証する。旧APIから現行APIへのテスト移植が必要なら全受入条件の対応表と同等以上のassertionを示し、元FAIL記録を残す。ユーザー合意なしに60秒/240秒仕様を消さない。
**両件が未解決の間、呼吸/数息観のruntime置換やコンテンツ拡大を本番採用しない。読取専用の棚卸しは並行可能。**

## 1. 追加する1実践の共通契約

既存ID/キー/順番/時間/画像を維持する。以下は将来のCore定義で、既存catalogを書き換えるものではない。

| 要素 | 必須内容 | 不備時の扱い |
| --- | --- | --- |
| identity | stable practiceId、schemaVersion、contentRevision、種別asana/breath/meditation、既存ID/alias対応 | ID重複・異なる実践を同義aliasとして統合することを拒否。既存session IDを再採番しない |
| content | 日本語名、開始姿勢、動き、呼吸、一般注意、目安、画像/段階と説明 | 抽象名だけの新規実践はreview待ち。治療目的の処方を生成しない |
| planning | intensity、beginner/gentle適性、可動域/バランス/負荷、選択可否 | メタデータ未確認を安全と推測しない。既存activeを一括非公開へ変更しない |
| knowledge | sourceId、参照版/箇所、由来、照合者、照合日、verified範囲/不足状態 | Knowledge不足を明示。verified booleanのみでDB実在確認済みとしない。新規手順は資料/レビューなしでLLMに創作させない |
| timing | timingMode、plannedHoldSec/phaseSec/rounds、transition、左右、elapsed定義 | 時間の単位と意味を明示。表示の1分を実音声込み60秒と勝手に読み替えない |
| guide | cueId、cueKind、side/round/phase、displayText、speechText、audioKey、Visual stage、終了条件 | 字幕/音声/画像を別々に差替えない。cue欠落時に無音のまま成功と扱わない |
| assets | 公開local path、hash、生成原稿revision、voice/生成手順、録音長、端末試聴状態 | missing/mismatched assetは新規登録の受入FAIL。既存asset削除・キー再利用禁止 |
| review | draft→content-reviewed→device-verified→approved、証拠/承認/rollback | テスト緑だけでapprovedにしない。既存statusへ自動適用しない |

新規アーサナ: 単側/左右を明示、左右同じhold、切替cue/時間、初心者に全身/方向が分かる画像。新規呼吸法: inhale/hold-in/exhale/hold-outの秒数と順番/rounds、不要phaseは明示的0、Visual対応、無理をしない説明。息止めを全利用者の既定へ自動導入しない。
新規を通常Planへ追加するのはレビュー/受入後の別PR。既存event-demo（山/猫と牛/子供各1分）はcatalog拡大から独立した固定構成を維持する。

### Guide cueの設計例（実行コードではない）
```text
practiceId: vrksasana        contentRevision: existing-baseline
kind: asana                 timingMode: narration_then_hold
right: instructions -> hold(30s)
transition: audio-ended gate
left: instructions -> hold(30s)
completion: audio-ended -> complete
instruction display: 「吸って吐きます」 / speech: 「吸ってはきます」
```
これは左右各30秒の現行意味を保存する例。各端末で声の速度を変えて30秒に収める設計ではない。

## 2. 時間・同期契約

| mode案 | 現行の比較対象 | 互換性ゲート |
| --- | --- | --- |
| wall_clock_with_voice_drain | 山/猫と牛 `AsanaClockRuntime` | 数字/時刻cue/mandatory音声待機/optional扱いを現行traceと比較。音声終端を切らない |
| narration_then_hold | 立ち木のvoice→silence | 案内中「案内中＋保持予定」、音声ended後に保持残秒開始、左右同じ秒、切替で保持を消費しない |
| phase_minimum_and_voice_end | Box等のphaseDurationSec | phase時間と音声終了の両方を待つ現行挙動を明示。声が4秒超なら実phaseが伸び得る点を実測し、表示との矛盾を検査。固定4秒へ無断変更しない |
| narration_then_silence | その他呼吸/瞑想cue | 案内長＋silenceが目安を超える場合を記録。画面のwall時計と完了条件が一致するか先に監査 |

共通イベント案: sessionId、sequenceRevision、cueId、phase/side/round、timestamp、subtitle、Visual stage、plannedHoldSec、remainingHoldSec、elapsedSessionSec、voiceStarted/Ended、complete/error。
全イベントに同じsession/cueの識別子を付け、停止・離脱・再開始前の遅延通知を無視する。pause中は保持時計を凍結。completionは必要音声終端を待ち、一度だけ通知する。
ガイド画面到達ではstartを発火しない。未開始/中止は保存0、完了後のみ記録フォーム/保存。Safety Gate/Today Context解決は外側と最終startの両方で維持。既存Auth/DB/保存serviceは置換しない。

## 3. 実装を分ける順序

| 段階/独立PR案 | 変更対象 | 受入 / 次段階へ進む条件 | rollback |
| --- | --- | --- | --- |
| P0 優先調査 | Q-02/Q-03の実経路・原稿・asset・履歴・全assertion対応表 | 失敗記録保存、仕様不一致の原因特定。修正するなら別承認/PR、試聴と同等受入が必要 | 製品を触らない調査なら不要。修正は独立revert |
| P1 棚卸し・型契約 | read-only inventory、共通型/validatorとfixtures。UIへ未接続 | 既存12asana/7breath/5meditationのID・時間意味・原稿/画像/出典充足率。未確認はunknown。重複ID、欠損asset、左右不均等を新規fixtureで検出 | このPRだけrevert、catalog/runtime非変更 |
| P2 互換adapter | 現行catalog→PracticeDefinition、現行出力shadow比較のみ | STEP2/6 ID/順/時間、DEMO固定構成、cue/原稿/asset/hash/Visualに差分なし。aliasは個別照合 | shadow呼出を外し旧経路そのまま |
| P3 単一アーサナpilot | Q-02/Q-03調査後、通常版の山等1件を共通読取契約へ。schedulerは既存 | 実timeline/数字/音声/字幕/390px/停止再開/完了一致、Safety回帰。DEMOには独立受入まで未適用 | 元adapterに戻す。旧assetを残す |
| P4 呼吸pilot | 呼吸Q-02解決後、Boxまたは腹式1件。既存engineをadapterで包む | phase/round/実音声長/Visual/字幕/カウント/中止保存0、Android/LINE試聴と現行比較 | 対象1件だけ旧adapterへ |
| P5 新規1件追加 | approved定義1件＋画像/音声/Knowledge根拠、既存定義は不変 | 下の追加チェック全PASS、既存回帰・本人受入、別途公開承認 | 新規選択のみ外す。既存会員記録/ID/asset削除なし |
| P6 残りへの展開 | 1実践ごと独立PR。瞑想はQ-03解決後 | 対象別実機等価性。全体を一括新schedulerへ移行しない | 実践単位で戻せる |

今回実施するのは設計文書まで。P1以降の製品実装・新規コンテンツ・migration・deployは未実施。

## 4. 新規追加/移行PRの必須チェック
1. 仕様ID AUD-01/02、TIME-01/02、DEMO-01、SAFE-01、DATA-01、UI-01への影響を記載。基準commitとcontent/asset hash保存。
2. ValidatorでID・参照・asset存在・字幕/かな原稿・時間の単位・左右・phase/round契約を検証。validator成功は安全性/発音の人の判断に置換しない。
3. 実製品builder/runtimeをimportして停止/遅延通知/pause/終了/音声重複/字幕先走りを検査。promptやruntimeをテスト用に複製しない。
4. Android Chrome/LINE入口別の実音声試聴（「はきます」末尾含む）、390px映像/画像/CTA/数値/nav、時刻付きtrace。環境と確認者を記録。
5. 既存PlanのSTEP2/6順/時間とevent-demo、AI先生Safety、未開始/中止0/二重保存なしを保護。実OAuth/DBが未検証なら未確認、受入完了にしない。
6. Build・型・主要CI・対象全受入と独立rollbackを確認。公開は個別承認後、送信source/asset hashと公開後実測を記録。

## 5. 今回の状態
PR #15 merged、main a770b129。PR CI audio/edge-safety success。Q-02/Q-03は再現FAILのまま、script/期待値不変。品質基盤の採用を未解決2件の解決と混同しない。
実践logic、音声file、timer、AI先生、Auth、DB/RLSは変更なし。Bolt Publish/Edge deploy/DB操作なし。本設計文書の後継PRはレビュー用で、今回はmergeしない。
