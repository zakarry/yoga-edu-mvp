# 継続ブラウザ検品とQ-05の操作経路

基準main: `3d2c0b1f6a2848b7c43dbb67b66a08e4c3abad11`。AGENTS.md、PRODUCT_REQUIREMENTS.md、REGRESSION_TESTS.md、USER_FEEDBACK_BACKLOG.mdに従う。対象仕様はAUD-02、TIME-01/02、UI-01、数息観専用Session。

## Q-05の証拠を訂正・限定する

最初の確実な再現はPR #23検証中の模擬時計/transportによるPracticeAudioRuntimeの再現であり、利用者がBox画面の一時停止ボタンを押した記録ではない。USER_FEEDBACK_BACKLOGの2026-10-12 Q-05と、Q05_AUDIO_CONTROL_FIX.mdが根拠。元の操作画面・端末・録画は未提供で、推測して確定しない。

現在の公開経路はHome→Pranayama→実践を始める→Boxの呼吸ガイド→実践スタート→MyAITeacherPageのbreathwork-active-section→ResultPageのBreathworkExperience。診断結果のBoxBreathingExperienceも同じコンポーネントを使用する。BreathworkExperienceはcreatePracticeAudioRuntimeを使用するが、操作は「もう一回やる」で、pause/resumeを呼ぶUIは実装されていない。今回一時停止ボタンを追加しない。

立ち木のpractice-active-sectionには一時停止/再開/中止があり、同じPracticeAudioRuntimeと共通voiceGuideエンジンを使用する。数息観は専用Session、通常瞑想と太陽礼拝にも独自の停止UIがあり、これらをBoxの停止経路とは扱わない。

Q-05修復はBoxの通常再生でも共通ランタイムを通る。通常16フェーズと終了音声、同時WebAudio源最大1をブラウザで検査する。再開時の修復は実装を直接呼ぶ既存9+1テスト、利用者操作では立ち木の連続pause/resumeと確認付き離脱を検査する。これを「Boxの長音声停止・再開の実機PASS」に拡張しない。旧終了イベントの無効化は既存制御可能時計テストの証拠で、ブラウザで捏造しない。

## UI修正

固定mobile-bottom-navが文書内のpractice-active-actions（停止・再開・中止・完了ボタン）の上を覆う。実践の操作欄だけをstickyでnavの上72px＋safe-areaへ配置し、既存navの項目・位置・ボタン文言を維持する。スクロール余白も付ける。音声/時計/字幕/Visual/Safety/Knowledgeは変更しない。文書内の途中位置や端末のsafe-area/ソフトキーボードは別の実機検品が必要。

## 実行と判定

- 既存回帰: `npm run test:regression`。24定義/211素材とQ-05制御テストを保持する。
- 新規ブラウザ: `npm run build`→`npx playwright install chromium`→`npm run test:browser`。CIはローカルpreviewを起動し、本番/DB/認証へ接続しない。17ケース、実音声、実時間、時計加速なし。4実践の完了/時間表示/字幕更新、3幅×4実践の横幅/固定nav/実際のクリック判定、立ち木の3連続pause/resume/確認付き離脱。
- Windowsの既存Edgeは環境変数PLAYWRIGHT_EXECUTABLE_PATHで指定できる。CIではChromiumをインストールする。
- 既存Vercelを再検品する場合だけPRACTICE_BASE_URLに承認済みの既存Ready URLを指定する。新デプロイなし。テスト前後にデプロイcommitを別途照合する。aliasだけではソース一致を保証しない。今回UI修正は未公開なので、既存Vercelを修正済みと報告しない。
- 各ブラウザは独立した未ログインcontext。保存ボタンは押さず、trialクリックによるヒットテストのみ。既存24件の一括移行なし。
- 入口は確認済みデスクトップ導線、実践画面で320/390/430pxに変更。モバイルの入口全体の検証とは区別する。
- PASSは観測対象だけ。WebAudio instrumentationは元メソッドを呼ぶ観測であり、音声モックではない。一時停止はAudioContext suspendedを検査し、sourceが存在することを重複/再生中と誤判定しない。数息観のHTMLAudioの聞こえ方はこのWebAudio観測では証明できない。
- PlaywrightのHTML report、失敗trace/screenshot、時刻付き字幕/時計trace、モバイルscreenshotをActions artifactとして14日保存する。失敗を自動retryで隠さない。

## 人による公開前検品

Galaxy ChromeとLINE内ブラウザで「はきます」の発音、最後の言葉までの再生、聞こえる重複、完全同期、左右保持、Visual、320/390/430pxの上下スクロール/タップ/固定nav、safe-areaを確認する。端末/OS/ブラウザ版/commit/音声キー/確認者を記録。認証・AI先生・カルテ・管理画面・クラウド保存の統合は別工程。

## 公開防止

vercel.jsonのgit.deploymentEnabled=falseでmainと今回の作業ブランチqa/practice-browser-regressionを除外する（Vercel公式Git Configuration）。PR #25の正式採用はユーザー承認済みだが、新規公開とは分離する。mainへのmergeでVercel本番が自動更新されないようにし、既存Readyは維持する。他ブランチは既定の公開動作を維持するため、将来の作業ブランチpush前にも必ず公開条件を確認する。新規Vercelデプロイ、Bolt Publish、DNS/DB/Edge/Secret/認証変更は今回行わない。

PR #25採用時から、17件を今後のコンテンツ追加・移行と実践UI変更の標準回帰とする。AGENTS.md、PRODUCT_REQUIREMENTS.md、REGRESSION_TESTS.mdのゲートを一致させる。認証・AI先生・カルテ・管理画面の統合は独立stagingと書込み境界の確定後に別検品する。
