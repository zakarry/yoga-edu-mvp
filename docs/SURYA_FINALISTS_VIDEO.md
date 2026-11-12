# 太陽礼拝・ファイナリスト導線 作業記録

基準main: e213cbd0381ed4de904fa4474af06d23af25a87f。開始時差分なし。
ブランチ: feat/surya-finalists-video。
読了: AGENTS.md / PRODUCT_REQUIREMENTS.md / REGRESSION_TESTS.md / USER_FEEDBACK_BACKLOG.md / BROWSER_PRACTICE_ACCEPTANCE.md / GALAXY_LINE_ACCEPTANCE.md。
対象仕様: UI-01、DATA-01、LINE-01、AUD-02（既存音声保護）、新規SURYA-01。

現状: App.tsxにsurya-namaskar画面と既存12ステップがあるが、ENTRY_PAGE_MAPに共有入口がなく、動画とファイナリスト向け導線もない。現行yogai.netの未ログインHome/メニューを確認。
実装範囲: 紹介コンポーネント追加、Appの入口/会員導線、メニュー項目、専用CSSとテスト。
保護: 12ステップ本体/カタログ/cue/音声/画像、24定義/211素材、既存認証実装と設定、DB/Edge/Secrets、PR #27〜#33。
検証予定: npm ci / typecheck / test:regression / build / test:browser、PC/390px、未ログイン動画/練習、登録/ログイン/会員CTA、復帰・キャンセル、YouTube外部リンク。
公開境界: 新規ブランチとDraft PRのみ。main merge、Bolt Publish、本番DB/Edge/Secrets/認証設定変更はしない。

## 動画調査（2026-11-12 JST）
- 指定URL: https://www.youtube.com/watch?v=mRZ6bczpAgA
- タイトル: ヨガ検定３級実技試験対策講座「スーリヤ・ナマスカーラ（太陽礼拝）」
- 投稿: 公式チャンネル全日本ヨガ連盟。channel ID: UCcvHqyHj_66436TV2jITkfA。
- 3分42秒、限定公開。説明欄は未記入。
- 公式サイト https://yogaorg.jp/2021yogaday.html が同名YouTube公式チャンネルを案内。
- YouTube共有→埋め込むでiframeコードを提供。埋め込み内で講師の導入映像の再生を確認。
- 公開設定の変更や動画ダウンロード/再配信は行わない。出典と権利帰属をプレイヤー外に表示。
- YouTubeの技術的な埋め込み提供を確認したもので、個別の契約や大会による権利許諾書の確認ではない。
