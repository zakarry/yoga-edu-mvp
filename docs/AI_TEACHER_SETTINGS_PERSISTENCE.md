# AI先生設定のアカウント別永続化（実装PR、未公開）

基準main: `e213cbd0381ed4de904fa4474af06d23af25a87f`。FB-01 / DATA-01。PR #26を採用後、独立stagingは未作成という利用者回答に従い、ローカル隔離DBで検証する。本番DBへのmigration適用、実装PRのmerge、公開は別工程。

## 保存契約

`public.ai_teacher_settings.user_id` は `auth.users.id` と1対1、アカウント削除時CASCADE。氏名や会員profile、認証providerのemailをキーにしない。同じSupabase user IDは同じ設定、別IDは別設定。Google/LINEが別IDになった場合の統合は自動実行しない。

|項目|保存内容|
|---|---|
|先生|名称（80文字以内）、avatar、Teacher Personality、専門分野、UI言語、指導言語、作成日時|
|利用者設定|説明量、声かけ頻度、励まし頻度の選択値|
|制御|revision、更新日時（DB管理）|

会話・診断・身体症状・実践履歴・先生の成長facts・Knowledgeは保存対象外。自由入力の先生名にも個人・医療情報を入れない。既存globalブラウザ設定 `yogaTeacher` / `yogaGrowth.prefs` は未ログイン時のみ使用し、ログイン時に自動コピーしない。ログイン直後はDBの確認済み設定だけを使う。設定は同一端末の別アカウントへフォールバックしない。

初回の成功した欠損読込後だけINSERT、既存行はownerとrevisionを条件にUPDATE。読込失敗時に保存禁止、保存失敗時は入力と最後の確認済み設定を保持して表示。競合時は再読込後に利用者が再保存する。アカウント切替・logout・画面離脱時にAbortと世代番号で古い応答を無効化する。設定削除はpersonaを空にして保存し、prefsは保持する。アカウント削除で全設定行を削除する。

## RLSと権限

SELECT / INSERT / UPDATE / DELETE各policyで authenticated の `auth.uid() = user_id` を要求する（UPDATE/INSERT WITH CHECKを含む）。anonアクセスを禁止。UPDATE権限は設定列だけで、user_id/revision/更新日時を利用者が直接変更できない。DB triggerでrevisionを進める。service_roleをフロントエンドで使用しない。

追加migration: `20261013000100_ai_teacher_settings.sql`。既存DB/RLS/会員行を変更せず、新テーブルとその関数/trigger/policyのみ。**今回remote DBへ未適用**。実環境採用前に独立Supabase stagingへ適用してPostgREST、実認証、既存profileとの整合性を確認する。

## My Yoga Memoryとの境界

今回Memoryの保存・削除処理、同意フラグは変更しない。先生設定保存をMemoryへの同意と解釈しない。次の独立受入が必要：本人の明示的opt-in、保存候補と用途の確認、保存一覧・個別編集/削除・全削除、同意撤回後の新規保存停止、本人のみRLS、センシティブ情報は初期保存禁止＋別の明示同意、会話からの自動保存禁止。既存 `allow_ai_memory` / `allow_sensitive_data_storage` とUI・service・サーバの全経路の強制を再監査する（今回保証しない）。ローカルMemoryのアカウント紐付けも別課題で、自動移行しない。

## 検証境界と運用

- `test:teacher-settings`：PGlite（実PostgreSQLエンジン）にmigrationを適用し、非superuser authenticated/anonと合成auth.uidでRLSを実行。save/relogin相当、別ID隔離、他人行拒否、競合、削除、失敗、古い応答、二重保存、列限定を検証。
- `test:teacher-settings:browser`：実アプリUIを390pxで操作し、loopback専用Build、合成認証のREST応答と隔離PostgreSQLで保存/再読込/logout/login/分離/失敗を検証。外部originへの通信を遮断。本番VercelやSupabaseへ接続しない。
- 標準Playwright17件と従来全回帰は別に実行。24コンテンツ/211素材/数息観時計/Q-05/左右時間を従来fixtureで保護。MyAITeacherPageは明示した設定関連編集だけを逆適用して旧hashとの一致を検査し、無関係な変更で失敗する。
- 合成認証は実GoTrue/PostgREST/OAuthの検証ではない。独立Supabase staging、Google/LINE再ログイン、別端末復元、Galaxy/LINE音声・UIは未確認。模擬PASSを実機PASSにしない。
- migration未適用環境では読込エラーと再読込導線を出し、ブラウザ設定へ自動フォールバックしない。公開前に独立staging受入とmigration運用を確定する。
- rollbackは実装PRをrevertし新テーブルを保持（データ破壊しない）。本番drop/削除は行わない。Vercel当該ブランチとmainの自動deploy抑止を維持する。

参考: https://supabase.com/docs/guides/database/postgres/row-level-security / https://pglite.dev/docs/api
