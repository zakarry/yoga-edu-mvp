# 必須回帰テスト

## 実行ゲート
`npm ci`、`npm run typecheck`、`npm run test:regression`、`npm run build`。
Edge起動/Safety: `deno test --node-modules-dir=none --allow-env --allow-read tests/ai-teacher-release.test.ts`。認証/プロフィールはstub、OpenAI/DB呼出は拒否。Secret不要。本番DBに接続しない。
PR CIは上記を実行する。ブランチ保護/required checksのGitHub設定は未変更で、CIの存在だけでmerge防止が保証される訳ではない。人の受入チェックを併用する。

| ID | 自動回帰（実製品ソース使用） | 手動/統合受入（必要時） |
| --- | --- | --- |
| AUD-01 | treeの字幕/読みmanifest一致、両側kana、WAV存在、生成手順は同じmanifest | Android Chrome/LINEで最後まで試聴。「つきます」でない。端末/ブラウザ/音声キー/hash/試聴者/結果記録 |
| TIME-01/02 | TreeHoldTimerの予定/残秒、実runtimeで案内後保持、左右30秒、pause保持凍結 | 左右全行程録画。案内時間、右保持、切替、左保持を分離。数字あり、重なりなし |
| AUD-02 | 長い音声を予定時刻で切らない、完了音声もendedまで待つ。停止後遅延callbackで進行しない。字幕は前音声中に先走らない | 休息末尾/次アナウンス重複なし、声と字幕とVisual同期。実ファイル/実機はmockの代替不可 |
| DEMO-01 | 現行3ポーズID/順/1分、assetとclock timeline、Box 4フェーズ契約 | event-demo未ログイン、CTA→お手本（未開始）→実践→完了、LINE/Web登録が分離。CTA/タイマー/UI総合は未自動化 |
| PRO-01/02 | 確定資格のみ判定、未取得/受講中でfalse | 学びリンクと遷移、320/390pxの見出し/本文/CTA/横overflow、公開文言 |
| DIAG-01 | directory既存40件正常/DEMO/旧診断snapshot非破壊 | 診断完了で主CTA1件、次の行動が明瞭、通常版DEMO推薦0 |
| SAFE-01 | 20Safety分類＋本番/preview実entrypoint起動2テスト。Safetyでprovider/usage呼出0 | 実LLM会話・YK0263/0267 context・日本語一貫性。分類PASS≠実回答PASS |
| CAM-01 | 16模擬camera lifecycle/errors/late permission/stream release | Android/LINE権限/実映像/停止/再起動。今回camera変更なし |
| DATA-01 | mainには永続化の統合suite未反映（Draft #10） | 同一Google/LINEユーザー再ログインで先生/Memory維持、読込失敗上書きなし、別ユーザー漏えいなし |
| CHAT-01 | Draft #10のfocus/pending/回答スクロール統合をmain導入時に移植 | STEP5で入力位置・送信待ち・最新回答がスマホで見える |
| TEACHER-01 | Draft #10本人下書きRLS/編集suiteはmain未導入 | 本人read/edit、他人不可。公開掲載所有権未確定なら付与しない |
| LOG-01 | クラウド保存統合は別受入が必要 | 完了保存+1、連打/reload同session1件、未開始/中止0。既存記録削除なし |

## 既存テストの監査結果
以前のCIはtree/audio4件＋buildだけ。camera/directory/Edgeテストは存在したがCI未接続だった。本PRで主要suiteを接続し、追加契約/lifecycle回帰を入れる。
`src/lib/__tests__/practiceAudioRuntime.regression.ts` はブラウザ補助でCI単独runnerではない。
`scripts/test-breathwork.mjs` は現行腹式呼吸字幕と異なる旧期待値でFAIL（2026-10-10実測）。`scripts/test-susokukan.mjs` は消失した `src/lib/susokukanSession.ts` 参照でFAIL。両方をPASSとは扱わず、legacyとして残す。新suiteは現行builder/phasesの意味契約を検証するが、旧suiteの全範囲を代替したと主張しない。移植はBACKLOG Q-02/Q-03。

## 結果記録
各確認に基準commit、環境、入力/操作、期待/実測、PASS/FAIL/未確認、証拠、制約を付ける。テストの緑だけで「完成」としない。修正は失敗ケースを残して同一suite再実行。公開承認後は公開asset hashと表示を検証し、重大障害時rollback。今回merge/Publishしない。

## Q-02/Q-03 修復PR（2026-10-10、未merge）
履歴追跡と[修復記録](BREATHWORK_SUSOKUKAN_REGRESSION_FIX.md)に基づき旧scriptの失敗を解決。元FAIL記録は上に維持。`test:breathwork` / `test:susokukan` / `test:practice-sessions`をCIのtest:regressionへ追加。数息観の全旧assertionは保持。人のAndroid試聴は未確認。


## PR #17 merge後の最新状態（2026-10-10）
main `c4ffbcc9e4c1d3b4aacad1b73813b747a604ebd0` に修復をmerge済み。上の未merge/旧FAIL記録は履歴。Q-02/Q-03の既存scriptと追加回帰、型、Build、CIはPASS。本番反映はBolt実ソース不一致により保留、Android発音試聴は未確認。数息観はPR #3の60秒media時計＋240秒静寂の専用Sessionを維持する。


## 2026-10-12 公開後確認と正式採用
最新main `e6e3958654ce9e01587023fa5ce1427dc82771a4` と照合。PR #17の製品ソースを維持し、公開更新を確認済み。添付689件の内容は改行正規化後にmainと一致（平坦な添付から元のディレクトリ構造まで証明したものではない）。
ユーザーがAndroid（Galaxy）で数息観を最後まで実践し、5分間の完走を確認したため、**数息観の5分完走のみPASS（ユーザー実測）**と更新する。音声・字幕の完全同期、「はきます」の発音、LINE内蔵ブラウザ、全端末等価性は未確認のまま。端末型番・OS・ブラウザ版・時刻付き録画は未提供。完走確認を発音や同期のPASSへ拡張しない。
数息観専用Session（60秒audio.currentTime→ended→240秒静寂）、5:00の初期表示、案内終了待ち、字幕/読み分離、左右均等保持、Safety基準を維持する。ユーザーはPR #16の正式採用と、別作業ブランチで1実践の共通データ契約の実装・テスト・PR作成を明示承認。本設計採用PRは文書のみ。新規大量追加、DB変更、Edge deploy、Bolt Publishは今回行わない。


## 共通データ契約pilot（2026-10-12、作業ブランチ）
`test:practice-core`を`test:regression`末尾へ追加。24定義のmain before/after出力、太陽礼拝3tempo、25保護ソース（数息観Session・数値UI・読み・Safety含む）、211 asset hash、腹式の実runtime trace等価性を保護。登録validatorの拒否ケースも検査。fixture基準 `05666f44134f5116998dc31d622e0830ef5ed599`。mock/ソース検査は人のAndroid/音声完全同期の代替ではない。実装PRのmerge/公開は未実施。


## 2026-10-12 次工程の確認と検品境界
PR #20は型・Build・全回帰の再実行、24出力/211 asset/保護ソース比較とGitHub Actions成功を確認し、main `cabf5e00490758477c83846d661475cdca59748b` へmerge済み。対象は腹式の読取契約だけで、scheduler/UI/Safety/Knowledge動作の変更なし。
ユーザーは前報告の「音声・字幕の完全同期と『はきます』の発音は未確認」を選択し「確認したよ」と報告。既存PR #17公開版の数息観に関する同期・発音をユーザー確認済みPASSとして記録する。端末型番/OS/ブラウザ版/音声hash/録画は未提供。これは新しい共通化後の腹式・立ち木、tree-v3音声、LINEや全端末への確認ではない。過去の未確認記録は履歴として残す。
検品バックログ: 腹式共通化後のGalaxy実聴/完全同期、立ち木共通化後のtree-v3「はきます」/末尾/左右全行程/数値UI/Visual/390px、LINE内蔵ブラウザ、Knowledge出典の独立照合、クラウド保存受入は未確認。模擬再生/SSR/ソース比較を実機PASSにしない。
今回の次対象は立ち木 `vrksasana` 一件。既存cue配列をそのまま返す読取契約。左右各30秒（1分設定）、案内・切替では保持を消費せず音声ended後に開始。予定数値0:30と保持0:30→0:29、pause/stop/遅延callbackを保護。新PRは未merge、DB/Edge/Bolt公開なし。

## PR #21最終採用と登録検品（2026-10-12）
main `1cbe4e4b7ff1c4728b26c852258bbf0e6b49eb9b` にPR #21を採用。最終head `0ae7d7363029cb7660b4b2fdd7902b01c81bd657`でnpm ci/型/Build/全回帰を再実行しPASS、GitHub Actions audio/edge-safetyはpush/PR両方SUCCESS。立ち木追加3テストを含む共通契約8件PASS/skip0。24出力/211assetと、元baselineを変更しない保護ソース比較、複数時間ガイド/実runtime模擬transport trace/SSR数値UIの等価性を再確認。実機音声・レイアウト・保存を証明するものではない。
[登録仕様](PRACTICE_CONTENT_REGISTRATION_V1.md)のG1〜6で証拠種別/環境/commit/hash/確認者/限界を項目単位に記録。次対象を1件移行する際のみ必要な実経路テストを追加する。文書だけの変更には仕様文言をなぞるテストを追加しない。今回は既存指定ゲートを全実行。立ち木のガイド丁寧化/左右時間改善はFB-13/14として独立、共通化の等価baselineを更新して隠さない。

## PR #22採用とBox読取契約（2026-10-12）
PR #22の名称/難易度/読み/字幕/時計/左右/Visual/安全/Knowledge/公開検品と個別時計を確認し、main `b7448f0fcddf3d103b279c9efd2ae61d4ddab27c` に正式採用。Box一件の契約を別ブランチで実装、まだ未merge。既存21cue/4秒×4フェーズ×4周、catalog/Knowledge/Safety/Visualと同じ配列を保持。runtime/画面/音声/画像の変更なし。
新5テストでmain baselineの全出力/20 SSR Visual状態/entrypointソース比較、契約identity/phase拒否、実runtime短長音声・pause・16phase・完了・stop trace等価、既存Q-05の同一再現を検証。全24出力/211asset/数息観専用Sessionの従来fixtureは変更なし。Q-05の等価再現テストPASSは音声品質FAILの解決ではない。[検品票](ANDROID_PRACTICE_QA_ABDOMINAL_TREE_BOX.md)で未実測を別記録。今回は追加content/DB/Edge/Bolt公開なし。

## Q-05 共通音声制御回帰（2026-10-12）
全回帰のtest:practice-coreにQ-05 runtime9件と実エンジン非同期1件を追加。長音声のphase時間AND音声ended条件、停止中終了、反復pause/resume、next/離脱/再開始/古い終了、final400ms、stop済み非同期再開/読込、最大同時音源1を検査する。[証拠と実機未確認](Q05_AUDIO_CONTROL_FIX.md)を参照。24出力・211assetの元fixtureは保持、3修復ソースの限定hashのみ別fixture。Mock PASSをGalaxy/LINE実機PASSとしない。

## 2026-10-12 Q-05採用後のBox回帰
PR #24採用main `89c3ccec6f3116a83eea73781984dd037eb05298` 上にBox契約を統合。Q-05追加10テストとBox5テストをすべてtest:practice-coreに保持（計23件）。原cue/contract cueは同じ修復済みruntimeで短音声・長音声・pause・16フェーズ・完了・stopの出力が一致。旧不具合観察は重複0/ended待ち/旧callback無効の受入へ更新。runtime/画面のhashは独立採用Q-05の限定fixtureを参照し、元の24出力・211asset・Box字幕/Visual fixtureは未変更。実機PASSとは区別する。

## ブラウザ回帰の追加（2026-10-13、未採用ブランチ）

既存test:regressionと別にtest:browserを追加し、Actionsのbrowser-practice jobで実行する。4実践の実時間と主要UI、320/390/430px、立ち木の実音声pause/resume/離脱を対象にする。[実行・Q-05経路・検品境界](BROWSER_PRACTICE_ACCEPTANCE.md)を参照。Box画面に存在しない一時停止UIを前提にPASSとしない。Android発音/末尾/LINE/完全同期の人による検品は維持する。UI修正は未公開。
