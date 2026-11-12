# 太陽礼拝の会員登録導線

## 現行仕様 SURYA-02（2026-11-12）
ユーザーが「一般の方皆さんも使えるように」「皆に登録させる目的」「はじめから」と指定。SURYA-01の未ログイン動画・練習公開を変更し、太陽礼拝への入口から無料会員登録・ログインを必須にする。
- ファイナリスト限定の見出しと大会向けの注意文を削除。
- 未ログイン・同意未完了では動画iframe・外部動画リンク・12ステップ実践をマウントしない。登録案内のみ表示。
- Google/LINE既存認証と既存ConsentGateを利用。登録完了後は同じ太陽礼拝ページへ戻る。
- 会員機能接続不可時も動画・実践を開放しない。ログアウト時は非表示へ戻る。
- サイト内の会員導線であり、YouTube側の公開設定や直接視聴の制御は変更しない。
- 既存12ステップ本体、24コンテンツ/211素材、認証設定、DB/Edge/Secretsは変更しない。

基準main: 75974dc852334e628d87970528d17292edb5e929。ブランチ: fix/surya-public-introduction。
原因/再現: ファイナリスト限定文言と未登録での動画・練習利用が、一般向け・登録必須の目的と不一致。
読了: AGENTS.md / PRODUCT_REQUIREMENTS.md / REGRESSION_TESTS.md / USER_FEEDBACK_BACKLOG.md。
影響: SURYA-02 / UI-01 / DATA-01。検証: 型/回帰/Build、会員状態別の表示、320/390/1280px、メニュー/直リンク/再読込。
公開は本スレッドの本番反映指示とその修正指示に基づく。実OAuth登録・実端末は自動テストと区別する。

## 以下はSURYA-01の初回実装記録（履歴）

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
