# Yoga AI 開発契約

適用範囲: このリポジトリ全体。2026-10-10、main `ac06d9457418a509641c2296e79a44da7aeb47b3` と PR #10〜#14 を照合。

本書とPRODUCT_REQUIREMENTS.mdを正式な開発基準として採用。PR #15採用main: `a770b12910b346aba442433177b53daaada7d615`。

## 作業開始時（人・Work・Codex・Bolt共通）
1. 最新mainを取得し、基準commit ID、作業ブランチ、未コミット差分を記録する。既存作業を上書きしない。
2. 本書、[確定仕様](docs/PRODUCT_REQUIREMENTS.md)、[回帰テスト](docs/REGRESSION_TESTS.md)、[フィードバック](docs/USER_FEEDBACK_BACKLOG.md)を読む。PRに「読んだ文書・影響する仕様ID」を記載する。AGENTS.mdの自動読込を保証したと考えない。
3. 確定仕様／未反映の改善／未確認を区別する。古いチャット・ZIP・Draft PRだけで最新mainの仕様を置き換えない。矛盾は証拠とともに記録する。
4. 不具合を再現し、原因、変更対象、保護対象、必要テストを先に記録する。修正範囲を増やす場合は依頼範囲を確認する。

## 実装・検証
- mainへ直接pushしない。作業ブランチ → 最小差分 → テスト → PR。merge・Publish・Edge deployはその工程へのユーザー承認が必要。PR #15は2026-10-10に明示承認を受けてmainへmerge済み。今後のPRのmerge・公開は個別の承認範囲に従う。
- AI先生Conversation Engine v2.2、認証、LINE、MFA、管理者権限、会員データ、DB/RLS、DEMO分離、カメラ、カルテ、図鑑を無関係な修正に混ぜない。
- 音声字幕と音声生成原稿を分ける。「吐きます」は音声側で「はきます」と指定。音声キー・生成原稿・生成手順・WAV/MP3を一緒に確認し、Androidで人が発音と末尾までの再生を聴く。テキスト検査だけを発音PASSにしない。
- 案内中の数字は保持予定時間。保持中だけ残秒を減らす。案内を無数値の文章に置き換えない。左右の保持は均等、案内・切替は保持を消費しない。
- 音声終了前の次音声割込み、字幕先走り、早期完了を防ぐ。実時間、保持時間、案内時間を混同しない。
- イベントデモと公式LINE主入口、Pro Yogaのスマホ表示・公開文言を維持する（仕様ID参照）。
- 製品コードへ未定義 `test` や配信を誘発するコメント・マーカー・ダミー処理を追加しない。Secretを表示・ログ保存・commitしない。
- `npm ci` → `npm run typecheck` → `npm run test:regression` → `npm run build`。Edge関連は `deno test --node-modules-dir=none --allow-env --allow-read tests/ai-teacher-release.test.ts` も実行する。変更領域の実機/統合確認は回帰表に従う。
- 模擬音声・模擬ログイン・ローカルPASSを本番/Android/実LLM PASSと書かない。未確認と失敗を明示する。テスト失敗を期待値変更だけで隠さない。

## PR・公開ゲート
[PRテンプレート](.github/pull_request_template.md)を埋める。対象外差分ゼロ、基準/検証commit、テスト結果、未確認、独立rollback手段を残す。CIが緑でも手動受入の代替にはならない。
公開を別途承認された場合だけ、送信対象ソース/hash、GitHub main同期、対象Function限定、公開後実測を記録する。HTTP 503、認証障害、重大Safety違反、主要機能破壊は安定版へrollback。軽微な品質問題は明示してバックログへ。

仕様変更は仕様ID・理由・ユーザー合意・回帰条件を同じPRで更新する。「完成」は対象範囲と実測証拠を伴う。100%の将来非破壊は約束せず、チェックと記録で再発を検出する。
