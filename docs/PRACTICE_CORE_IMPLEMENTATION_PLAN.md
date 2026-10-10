# Practice & Knowledge Core v1.0 — 共通仕様案と段階的実装計画

作成2026-10-10、基準main `a770b12910b346aba442433177b53daaada7d615`（PR #15正式採用）。
[AGENTS](../AGENTS.md)、[確定仕様](PRODUCT_REQUIREMENTS.md)、[回帰表](REGRESSION_TESTS.md)、[実ユーザー課題](USER_FEEDBACK_BACKLOG.md)を読んで作成。
本書は次工程用の仕様案であり、製品実装/動作変更の承認ではない。今回の差分は文書のみ。既存runtime・音声・タイマー・AI先生・認証・DBを変更しない。

## 0. 調査履歴と現在の修復状態

| 課題 | 採用mainでの実測 | 次の調査・解決条件 |
| --- | --- | --- |
| Q-02 呼吸法 | `node scripts/test-breathwork.mjs` exit 1。54行: `abdominal should contain exhale cue` | 旧期待「鼻からゆっくり吐きます。」と現行builder「鼻からゆっくり吐いて、お腹がやさしく戻ります。」「鼻からゆっくり吐いて、力を抜きます。」の差を、変更履歴/承認/音声原稿/実assetで照合。後続未実行assertionも棚卸し。期待変更だけで解決しない |
| Q-03 数息観 | `node scripts/test-susokukan.mjs` exit 1。`src/lib/susokukanSession.ts` を解決できない | 旧テストは60秒の単一録音＋240秒静寂、media時刻字幕、pause/stop/restart/errorを要求。現行は `MeditationExperience`→`SusokukanExperience`→`buildMeditationCues`→`PracticeAudioRuntime`、画面時計はDate.now。実再生/字幕/完了と画面時計の不一致有無を追跡する。missing fileだけの問題と断定しない |

保存する証拠: 基準commit、両scriptのhash、各assertionの意図、どの製品経路を通るか、生成原稿/asset hash、時刻付きsubtitle/voice start/end/phase/remaining、実Android聴取結果。9月25日完成版との比較は該当版の実ソースを特定してから行う。
完了判定: 既存テストを削除/skip/緩和せず、製品の実挙動と仕様の齟齬を特定し、必要な修正を別PRで検証する。旧APIから現行APIへのテスト移植が必要なら全受入条件の対応表と同等以上のassertionを示し、元FAIL記録を残す。ユーザー合意なしに60秒/240秒仕様を消さない。
### PR #17 merge後の基準（2026-10-10）
基準mainは `c4ffbcc9e4c1d3b4aacad1b73813b747a604ebd0`。上表はa770b129時点の失敗履歴として保存する。
Q-02は9/21の原稿/専用音声変更に旧期待値が追随しなかったことと、Node実行時のwindow依存を特定。初回・反復の専用ガイドを検査し、吸気4秒/呼気6秒×6周を保持した。字幕は漢字のまま、speechTextは「はきます／はいて／はく」を指定する。音声生成原稿と録音自体の実機発音確認は独立した受入条件である。
Q-03は9/18のSession削除と時計変更を特定し、PR #3の専用Session/画面接続を復元。全旧assertionと追加回帰がPASS。詳細は[修復監査](BREATHWORK_SUSOKUKAN_REGRESSION_FIX.md)。
ソース修復・CI PASSと本番反映/Android試聴は別。現在Bolt実ソースがmainと不一致のためPublish未実施、Android発音未確認。既存実践を共通runtimeへ置換する前に、公開反映と対象実機の等価性を確認する。

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
| narration_then_silence | 腹式呼吸等のvoice→silence | 腹式は音声ended後に吸気4秒/呼気6秒を開始し6周。保持合計60秒と案内込みの実時間は区別する。字幕/Visualは同一cue開始に同期 |
| media_narration_then_silence | 数息観専用 `SusokukanSession` | 60秒録音中はaudio.currentTimeで字幕/専用時計を進め、ended後に240秒静寂。予定合計300秒、初期5:00。停止/一時停止/再開/バッファ遅延を保持。汎用wall時計・phase時計へ置換しない |

共通イベント案: sessionId、sequenceRevision、cueId、phase/side/round、timestamp、subtitle、Visual stage、plannedHoldSec、remainingHoldSec、elapsedSessionSec、voiceStarted/Ended、complete/error。
全イベントに同じsession/cueの識別子を付け、停止・離脱・再開始前の遅延通知を無視する。pause中は保持時計を凍結。completionは必要音声終端を待ち、一度だけ通知する。
ガイド画面到達ではstartを発火しない。未開始/中止は保存0、完了後のみ記録フォーム/保存。Safety Gate/Today Context解決は外側と最終startの両方で維持。既存Auth/DB/保存serviceは置換しない。

## 3. 実装を分ける順序

| 段階/独立PR案 | 変更対象 | 受入 / 次段階へ進む条件 | rollback |
| --- | --- | --- | --- |
| P0 公開受入 | Q-02/Q-03の実経路・原稿・asset・履歴・全assertion対応表 | PR #17の履歴/全assertionを保存。main/Bolt一致→公開→実再生受入。Android未確認は残す | 製品を触らない調査なら不要。修正は独立revert |
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

## 5. 安全・出典・登録時自動検品
- 安全情報はreview済みsource ID/版/該当箇所、一般注意、禁忌、対象条件、代替案を分離する。未確認はunknown。医学的安全性をvalidator成功やLLMの説明だけで確定しない。
- 代替案は承認済みpracticeIdへの参照と選択理由。Safety/Today Context Gateは移行対象外として維持し、禁忌を緩和しない。呼吸・瞑想も無条件に安全としない。
- Knowledge連携は参照実在、資料と姿勢/呼吸/手順の整合、版更新時の要再レビューを検査。出典なしをverifiedへ変更しない。棚卸しは読取専用で、DB/RLS/usage書込みなし。
- 登録validator: ID/alias衝突、必須項目、assetパス/hash/長さ/原稿版、字幕と読み原稿、左右保持差、phase秒数/順/周回、専用時計契約、source不足を報告する。
- 動的回帰: 実製品runtimeをimportし、音声遅延/ended/重複防止/pause/stop/restart/離脱/古いcallback/完了一度を検査。数息観は60秒media＋240秒静寂を別fixtureで保護する。

## 6. 読取専用棚卸しの納品単位
1実践1行でID、種別、active、UI入口、実runtime、時計契約、予定/実時間の意味、cue原稿/読み、asset/hash/長さ、Visual、左右、出典、安全レビュー、既存テスト、Android試聴状態を記録する。
既存件数は設計時のコード内監査で12asana/7breath/5meditation。件数だけで全asset/DB根拠を検品済みとしない。alias「交替鼻呼吸→腹式」は保留として別監査し、今回変更しない。
最初の移行候補は棚卸し完了後に1件選定。shadow比較→既存runtime adapter→ブラウザ/Android同等性→独立PRの順とし、数息観は専用時計を保持するadapterを後段に置く。新規アーサナ追加は別途承認まで行わない。

## 7. 実機検品
Android ChromeとLINEのLIFF/通常内蔵ブラウザを別環境として記録。音声キー/hash、端末/OS/ブラウザ、試聴者、字幕/音声/時計の時刻記録を残す。
「はきます」初回/反復、文末まで再生、次音声との重なりなし、左右保持/切替、音声ended後の保持開始、バックグラウンド/一時停止/低速読込/再開/終了を確認する。390pxの数値/画像/CTA/navを検品する。
数息観は録音60秒の全字幕、240秒無音、専用時計5:00から完了まで、停止/再開を確認する。自動テストやPC試聴をAndroid発音PASSに読み替えない。

## 8. 今回の状態（履歴）
PR #15 merged、main a770b129。PR CI audio/edge-safety success。Q-02/Q-03は再現FAILのまま、script/期待値不変。品質基盤の採用を未解決2件の解決と混同しない。
実践logic、音声file、timer、AI先生、Auth、DB/RLSは変更なし。Bolt Publish/Edge deploy/DB操作なし。本設計文書の後継PRはレビュー用で、今回はmergeしない。


### 最新状態
PR #17はmain c4ffbccへmerge済み。Build/型/主要回帰・CI PASSの記録あり。Bolt表示はmain Active/Syncedだが、書出し実ソースに12ファイル欠落/7差分を確認し、Publishを保留。PR #16は文書のみを更新し、PR #17公開確認後にmergeする条件を維持する。製品コード/音声asset/Edge/DB/RLSの変更は本設計更新に含まない。
