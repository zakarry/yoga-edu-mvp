# AI先生設定 検証記録（未公開）

基準main `e213cbd0381ed4de904fa4474af06d23af25a87f`、branch `fix/account-teacher-settings`。2026-10-13。

|区分|結果|境界|
|---|---|---|
|npm ci / typecheck / Build|PASS|既存chunk size警告あり|
|従来全回帰|PASS|TAP37件、camera16ケース、directory40fixtures、呼吸法/数息観スクリプト|
|追加設定テスト|7/7 PASS|PGlite実PostgreSQL、非superuser RLS、auth.uid合成claims|
|追加設定Playwright|2/2 PASS|Edge headless、390px実UI、合成authと隔離DB、外部通信遮断|
|標準実践Playwright|17/17 PASS|通常Build、実時間完走、模擬音声。Android実音声とは異なる|
|24コンテンツ・211素材|差分なし|従来fixtures/hashとGit差分で確認|
|GitHub Actions|PRで追跡|最終headの4jobs、push/pull_requestを確認|
|実Supabase / Google / LINE / 別端末|未確認|独立staging未作成、remote migration未適用|
|Galaxy / LINE内ブラウザの音声・発音・同期|未確認|今回ローカル自動テスト対象外|

新規保存、再読込、logout/relogin相当、A/B分離、指導言語/Personality/prefs復元、削除、読込失敗時保存禁止、保存失敗時入力保持をUI検証。RLSは他人のSELECT/INSERT/UPDATE/DELETE、anon、owner/revision列の直接変更を拒否。旧local自動移行なし、stale応答/duplicate保存/revision競合を制御テストで確認。

失敗履歴：初回の画面テストはスマホで非表示のdesktopログインボタン、次は同名設定ボタンの複数一致で失敗。実モバイルメニューと一意の設定タブへテスト導線を修正後PASS。期待値や製品機能を変更して隠していない。依存関係再現は起動中esbuildのWindowsロックで一度失敗、テスト終了後のnpm ciでPASS。

本記録は本番での永続化完了を意味しない。実装PR未merge、remote DB/認証/Edge/DNS/Secret変更なし、Publishなし。
