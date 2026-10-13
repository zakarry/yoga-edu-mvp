# PR #27 実Supabase統合検証の準備

2026-10-13。基準main `e213cbd0381ed4de904fa4474af06d23af25a87f`、実装head `92172bf1ac1a599047938c8e9a164ab1cb4a41dc`。AGENTS / PRODUCT_REQUIREMENTS / REGRESSION_TESTS / USER_FEEDBACK_BACKLOG参照。DATA-01/02、SAFE-01。PRはDraftを維持。本書・準備SQLはremote適用済みの証拠ではない。

## 現在の状態

独立Supabaseは前回回答で未作成。今回project-ref/接続確認がまだないため、以下の実Supabase検品は全て未確認。ローカルPGlite/RLS・合成ログインの結果と分ける。本番Bolt-managed DB、会員情報、Auth、Secret、Edge、DNSに操作しない。既存Vercel ReadyはPR #27未反映なので統合検品対象にしない。

## 独立プロジェクトの準備順（実際の案内は1操作ずつ）

1. https://supabase.com/dashboard を開き、組織の **New project** を押す。既存の本番プロジェクトを選ばない。
2. 新規作成画面で名称 `yoga-ai-teacher-staging` を入力。組織・リージョン・画面上のプラン/費用を確認する。DBパスワードは本人が生成しパスワード管理先へ保存、チャットへ送らない。内容確認後 **Create new project**。本番BoltのClaim/Change databaseは使わない。
3. 起動後、Project Settings / General（表示が違う場合は画面に合わせて確認）でproject-refと名称だけを確認。本番project-refとは別、空の新規DBであることをレビューし、非Secretの台帳へ記録する。接続先は `https://<staging-ref>.supabase.co`。既存のSupabaseへ移行/import/restoreしない。
4. 検証projectの **SQL Editor → New query**。最初に `scripts/staging/bootstrap-teacher-auth.sql` を内容確認して実行する。auth.usersが空・publicの通常テーブルが無い場合だけ進む。拒否した場合は削除/DROPして回避せず停止・調査。次にPR #27の **`supabase/migrations/20261013000100_ai_teacher_settings.sql` をそのまま1回適用**。この順はテストアカウント作成より前。SQL Editorのpostgres権限で動いたことをRLS PASSにしない。
5. Data API設定でpublicの対象4テーブルがAPIから利用可能か確認（現行DashboardはIntegrations / Data API）。権限とRLSを再確認。既存migrationの一括pushをしない。
6. **Authentication → Sign In / Providers（UI表示に応じて確認）** で検証projectのEmail/Passwordを使用。Google/LINEは未設定のまま。匿名ログインは使わない。Auth / URL Configurationには決定した検証originのみを指定し、yogai.netや本番callbackを追加しない。メール確認を使う場合は本人管理の検証メールで行う。SMTP変更は初期検証に不要。
7. **Authentication → Users → Add user → Create new user** からA/Bの2利用者を作成（UIにemail-confirmed項目があれば検証ユーザーの状態を記録）。使い捨ての架空表示名と本人管理の別メール、強い別パスワード。実会員IDをコピーしない。user UUIDをA/Bとして台帳に記録。profiles/全falseのprivacyがsignup triggerで作られ、admin/super-admin=false、tier=freeを確認。規約同意はアプリのConsentGateから行い、SQLで同意済みにしない。
8. 専用フロントエンドBuildの接続先を設定。値は本人がローカルのgitignore対象 `.env.supabase-staging.local` に入力。Workは名前・設定有無・project-refのみ確認し、キー値/パスワード/JWTを出力・コピーしない。ファイル名だけを用意して空のままでは設定済みとしない。
9. localhost（例 `http://127.0.0.1:4176`）でPR #27の専用Buildを動かす。既存 `dist/` や合成認証用 `dist-settings-test/` と分離。envとbundle内backend hostnameがstaging-refのみ、実ブラウザのネットワークに本番hostなしを確認してからログインする。Viteの環境変数はBuild時に埋まるため、既存Readyの再利用だけでは検証できない。実環境用Build/runnerの確定・実行はproject-ref確認後に行う。
10. 別端末検品には限定アクセスのHTTPS検証originが必要。既存Vercelの専用Previewが候補だが、Deployment Protection、Previewだけのenv scope、staging-ref固定・本番接続遮断を確認してから別工程で用意する。今回Vercel設定変更/新デプロイは未実施。GalaxyからPCのlocalhostへ直接アクセスした結果を別端末PASSにしない。

[Supabase公式新規作成/React](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)、[Email/Password](https://supabase.com/docs/guides/auth/passwords)、[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)。Dashboardのラベル変更があれば画面を確認して案内し、推測で本番操作しない。

## 最小スキーマとRLS

|対象|役割/権限|
|---|---|
|auth.users|新しいSupabase Auth自身が管理。既存会員/暗号化password/セッションを移さない|
|public.profiles|id=auth.users.id、本人read/限定列edit、役割student、tier=free、admin類false。本人がpaid/adminへ変更不可|
|public.privacy_settings|user_id本人read/edit、5つの保存/共有同意は全false。Memoryは今回対象外|
|public.user_consents|本人SELECT/INSERTだけ、版の組合せunique、UPDATE/DELETE不可|
|public.ai_teacher_settings|本人CRUDのRLS、anon拒否、owner/revision列の直接更新不可、revision trigger。PR #27 migrationを改変しない|

準備SQLは最初のprofiles/privacy・user_consents migrationから必要部分を再利用し、明示的GRANT/REVOKE・privileged列を安全な初期値で付ける。空プロジェクト用で、通常のproduction migrationsディレクトリへ入れない。`20260924115532_...admin_roles.sql` は本番UUIDの昇格とBM5依存を含むため一括適用禁止。管理RPC・Knowledge/BM5 seed・診断/実践ログ・Memory・directory・Edgeは今回初期スキーマに含めず、それらの統合結果をPASSとしない。既存会員/管理機能の非退行は従来自動回帰で確認し、実stagingの管理統合は別工程。

## フロントエンド設定台帳（値の報告禁止）

|変数名|必要な値の種類/扱い|
|---|---|
|VITE_SUPABASE_URL|新staging URLだけ（非Secret refで承認）|
|VITE_SUPABASE_ANON_KEY|検証projectのpublishable key（または検証legacy anon）。現行コードの変数名を維持。secret/service_roleは絶対に入れない|
|VITE_AI_TEACHER_LLM_ENABLED|false。Edge/実LLM検証は今回行わない|
|VITE_AI_TEACHER_TEST_FUNCTION|空。接続先の安全な切替手段として使わない|
|VITE_LINE_LIFF_ID|空。既存本番LIFFをコピーしない|
|VITE_GOOGLE_MAPS_API_KEY|空。今回の設定保存検品に不要|

Authのpublishable keyはブラウザ用途で、実ユーザーJWTとRLSで認可される。[公式キー仕様](https://supabase.com/docs/guides/getting-started/api-keys)。service_role/DB password/Google/LINE secret/本番の資格情報をBuildへ渡さない。A/Bのパスワード・JWT・Auth storageState・ネットワークtraceはSecret扱い。実AuthのPlaywrightでtrace/HARを保存する場合はtokensを含むので、初期はtrace/HAR/ログヘッダー保存を無効化し、画面証拠は合成名/結果だけ。

## 実Supabase受入表（開始前は未確認）

各行に検証head、staging-ref、日時、ブラウザ/端末、操作、期待/実測、証拠、PASS/FAILを記録。PostgREST拒否はHTTP失敗または見える行0/更新行0で判断し、コードだけでなく元行が不変であることを確認。

|ID|操作と期待|現在|
|---|---|---|
|S-01|Aで名称・UI/指導言語・Personality・専門・prefsを保存、成功表示/DBのowner=A、再読込して一致|未確認|
|S-02|A logout→新規login、名前等を復元。同一user ID、合成認証を使わない|未確認|
|S-03|同ブラウザA→logout→B。Aの設定/入力が出ない。B保存後Aへ戻るとAの設定だけ|未確認|
|S-04|独立した第2端末でA login、S-01の設定を復元。端末名/ブラウザを記録|未確認|
|S-05|Aの通常認証JWTでBのuser_idへREST SELECT/INSERT/PATCH/DELETE。全て拒否/0行、Bの元データ不変。anonも拒否。SQL Editorやservice_roleで代用しない|未確認|
|S-06|Aの設定API通信をブラウザで遮断。保存成功にせず入力/確認済み設定を保持、解除後retry成功。初期読込失敗時は保存不可|未確認|
|S-07|2つの独立ブラウザcontextで同じAを読込。片方保存、もう片方古いrevisionで保存→失敗表示、先の値を上書きしない。再読込後にretry成功|未確認|
|S-08|未ログインでlegacyブラウザ先生を作成。新しいCでlogin、旧先生が自動保存されず新規空。guestに戻って旧設定が残る（Cはこの項目専用）|未確認|
|S-09|Aの直接PATCHでuser_id/revision/管理列を変更できず、privileged値が不変。account切替時に遅い応答が旧設定を表示しない|未確認|
|S-10|実Google / LINE callback / 同一IDのprovider連携|許可済み検証戻り先未整備のため未確認|

S-05の自動REST検査はrunner内で実login→tokenをメモリ保持して送信、出力は結果と件数だけ。本番host宛はmethodを問わず拒否。実tokenを手でチャット/ターミナル引数へ貼らない。Syntheticなauth.uid/モックログインを使用しない。

## 本番導入に必要な別工程

独立stagingのS-01〜09を完了、Google/LINE検証戻り先を許可範囲内で用意しS-10確認、別端末の人の検品、未確認/失敗の解消、migrationの運用履歴/backup/rollbackレビュー、PR #27の個別merge判断、その後の本番migrationとソース同期・公開承認。本番backupからstagingへ会員情報をコピーしない。Bolt同期不一致が解消するまでBolt Publishしない。今回の準備SQLを本番へ適用しない。本番で適用候補はPR #27の設定専用migrationだけで、今回未実行。

失敗時はstagingでテストを停止し証拠を保存。本番のClaim/Change、RLS解除、service_roleで拒否を迂回、DB削除、Google/LINE設定書換えでテストを通さない。
