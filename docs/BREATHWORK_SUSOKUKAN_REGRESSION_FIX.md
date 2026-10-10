# 呼吸法・数息観 回帰FAIL監査と修復

基準main `a770b12910b346aba442433177b53daaada7d615`。作業ブランチ `codex/breathwork-susokukan-regression-20261010`。PR #16は設計資料のまま未merge。AGENTS/確定仕様/回帰表/バックログを照合。対象: AUD-01/02、TIME-01/02、UI-01、Q-02/Q-03。

## 読取監査の根拠
最初のcheckoutはshallowで削除履歴が見えなかった。mainをunshallowして全履歴を取得した後に原因を確定。9月25日以後にSessionが消えたと推測しない。

### Q-02 腹式呼吸
- `bad6ed7e0c3ff8dee5d653b6dc95141b3ed2e408` (9/18): PracticeAudioRuntimeへのbuilder移行。
- `fddc9ec` (9/18): テストを移行。旧定型exhale「鼻からゆっくり吐きます。」と独立した「肩の力を抜きましょう。」を期待。
- `cffce978b415cdc0e32e4853c11827e0d576f1d3` (9/21): 初回は「鼻からゆっくり吐いて、お腹がやさしく戻ります。」、反復は「鼻からゆっくり吐いて、力を抜きます。」、肩の力を抜く説明はintroへ。catalog原稿/専用audioKeyとも一致する変更だが旧テストを未更新。
- 基準mainのpatternは吸気4秒/呼気6秒/息止め0/6周。今回pattern・cue順・音声asset・runtime時計は変更しない。各フェーズ前の案内はendedを待ち、その後のsilenceが4/6秒。音声込み実時間が60秒と同じになる仕様ではない。
- 原因: 文言FAILは旧テストの契約更新漏れ。文言を通した後のruntime smokeはNodeにwindowがなく失敗する、独立したテスト環境不備も確認。製品runtimeをNode向けに変更せず、既存constructorへtransportのみ注入する。
- 読み監査: builderが字幕漢字をそのままspeechTextへ渡していたため、fallbackに読み曖昧性が残る。呼吸の「吐きます/吐いて/吐く」だけを「はきます/はいて/はく」へ明示する。録音MP3/キー/字幕は不変。

修正: 呼気の初回/反復とintro肩弛緩を個別の完全一致assertionへ置換し、意味検査の弱い部分一致で逃げない。4/6秒×6、読み、実runtimeの案内待ち/字幕対/hold/pause/単一完了を追加。既存Visual/6種asset/MP3時間検査は保持。Node smokeは模擬transportと実runtimeを使い、完了までassertionを追加。

### Q-03 数息観
- PR #3 `6ae4932efc4779558339c06dd2ec27e36cd39668`: 明示かなの60秒録音、media currentTimeに同期した11字幕、その後240秒静寂、合計300秒を確定。元テストはpause/stop/再起動/errorも検査。
- `2148a92b4e3180ba8483532a17f02c3fc6fb5431` (9/18): Sessionを削除し、SusokukanExperienceをcatalog/cue builder/PracticeAudioRuntime＋Date.now画面時計へ置換。旧テスト参照未更新。
- 参照欠落は事故的ファイル紛失ではなく明示的削除。しかも現行画面はwall時計で60秒後「静寂」とし、実音声終了/字幕を同じmedia時計で決めない。元の単一60秒録音・240秒静寂契約と等価ではない。テスト対象を新runtimeへ変更するだけでは仕様を捨てる。

修正: 削除直前 `2148a92^` の既存SessionとSusokukanExperience接続を復元。復元元はPR #3を含み、旧50秒版ではない。呼吸/他の瞑想/共通runtimeは変更しない。正しい参照は製品component → `src/lib/susokukanSession.ts` → `susokukanNarration.json` + `susokukan-intro-full-v2.wav`。
元の数息観テストの全assertionをそのまま維持。実componentのbuild/初期表示確認、20秒buffering timeoutで音声解放/古い通知無効を追加。既存の録音hash/原稿/60秒WAVは変更しない。

## 検証と限界
旧呼吸法・旧数息観scriptは修復後PASS。追加session回帰2件PASS（実runtime/Session、transportのみ模擬）。型/Build/主要回帰/CI結果はPRへ記録。
元の2つのFAIL実測と削除/文言変更commitは本書に保持。テスト削除/skip/Safety緩和なし。音声生成原稿/ファイルの人によるAndroid試聴は未実施。MP3/WAVの存在・時間・明示かなPASSを人の発音PASSと混同しない。

## 変更境界・rollback
製品差分は呼吸speechTextの明示読みと数息観専用Session/画面復元のみ。共通PracticeAudioRuntime、AsanaClockRuntime、AI先生Engine、Auth、MFA、LINE、DB/RLS、会員/カルテ、DEMO構成、Pro Yoga、カメラ、他の瞑想assetは不変。
回帰scriptはCIのtest:regressionへ接続。新Session共有Core化は行わない。rollbackは本PRのみrevert。main merge、Bolt Publish、Edge deploy、DB操作なし。

### 最終ローカル実測
npm ci / typecheck / Build PASS。主要suite: tree音声4、品質契約8、camera模擬16、directory40fixture、追加session2、旧breathwork/旧susokukan双方PASS。Edge既存22/22 PASS。既存Buildの大chunk/Supabase import warningは継続。実機・本番は未検証。npm auditの既存5件は今回依存更新で対応しない。
