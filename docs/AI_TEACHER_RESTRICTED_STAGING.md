# 独立staging公開ゲート（2026-10-23）

PR #27はDraft、本番導入は保留。ユーザー承認は独立stagingの新規Vercel作成・アクセス制限付き検証公開と、LINE戻り先の安全修正・テストのみ。本番・main・yogai.net・Bolt・DNS・本番DB/Edge/Secret/Authは変更しない。Google/LINEは専用安全設定の承認・完了まで無効。今回Edgeをdeployしない。

読了: AGENTS.md、PRODUCT_REQUIREMENTS.md、REGRESSION_TESTS.md、USER_FEEDBACK_BACKLOG.md。対象DATA-01/FB-01、認証は今回の明示依頼で必要な境界だけ。既存音声・タイマー・Knowledge・Memory・既存会員には変更しない。

## 原因・修正・保護

既存line-authは入力redirect_toを保存し、callbackでそのURLへセッションを返していた。戻り先許可照合がなく、許可外URLへのセッション転送につながり得る。新規配置の前に修正する。本番稼働版の攻撃再現は行わない。

- `LINE_AUTH_REDIRECT_ORIGINS`はカンマ区切りの完全なHTTPS originのみ。設定なし・不正設定は拒否。wildcard、資格情報、path、query、fragment、不正scheme、似たhostnameを許可しない。
- 認証開始時とcallbackの保存済みstateの両方を照合。許可外callbackはLINE token交換・Supabase session作成前にHTTP400、Locationなし。
- state消費はidとconsumed=falseで更新し、戻った行がちょうど1件であることを確認。ゼロ件・DBエラーはtoken交換前に拒否。
- SupabaseClientの型を明記。現行Deno lockに解決済みの2.45.4を維持し、SDKの一括更新はしない。
- 新しい環境変数を本番へ追加していない。将来このコードをEdgeへ配置する場合は、承認済みoriginの設定が必須。今回の修正を無設定のまま本番deployしない。
- 実ハンドラーをimportするDeno回帰で全HTTPを遮断・代替し、許可外のstart/callback、途中の許可取り消し、正常セッション、二重消費・0件・DBエラー・期限切れを確認する。実LINE認証PASSとは別。

## 配信の隔離

Vercel新規project `yoga-ai-teacher-staging`、ID `prj_vMO7vNM6xfkyWsolbJGFEGHFmUzS`。既存の3projectは変更しない。Git連携なし。新projectのVercel AuthenticationをAll Deployments（ssoProtection.deploymentType=all）に設定して読み戻し確認後に配信する。bypass token・共有バイパスURLは発行しない。

`node scripts/staging/build-site.mjs`は製品UIを使う独立entrypoint。接続先は`https://htnouayipmqvpckppbzv.supabase.co`とpublishable keyだけを明示的に組み込み、通常.envや追加VITE変数を流用しない。Google/LINEボタンは無効、LIFF・地図・LLMを無効にする。新規flagがない通常製品Buildでは既存OAuth挙動を維持する。

成果物`dist-isolated-staging`だけをCLIで関連付け・配信する。src、supabase、.env、node_modulesはアップロードしない。Vercel側のBuildで本番環境変数を読む処理はない。ファイルhash台帳を作成し、他Supabase hostname・特権JWT・secret keyを検査する。manifestにはpublishable keyの値を記録しない。

staging専用CSPをHTMLとレスポンスへ適用する。外部script/image/media/frame/workerを拒否し、connectは自サイトと独立backendのauth/rest/storageパスだけ。Edgeと外部WebSocketを許可しない。fetch、window.open、外部anchorのstaging専用ガードを併用する。外部リンク・地図・カメラなどが利用不可なのは今回の隔離条件であり、その機能の受入PASSではない。

## 検証と運用

- クリーンnpm ci → 型 → 全回帰 → 製品Build、実践17件・設定3件を実行。LINE/Safety実entrypointはDenoで実行。
- staging独自Playwrightはブラウザを起動し、初回の製品表示、OAuth無効、外部fetch/Edge呼出/window.open拒否、未許可リクエスト0、ページ例外0を確認。全外部リクエストにtest側の最終拒否もかけ、本番へ検査通信しない。
- CIのstaging検証keyは無効な明示fixture。CIは実Supabaseにloginしない。公開成果物は利用者のgitignored検証設定から別Buildする。
- 公開後、未ログインのHTTPでHTML/JS/assetがVercel認証により拒否されることを確認。ログイン済みブラウザで製品表示・OAuth無効・stagingのみへの通信を確認。生HAR/JWT/パスワードは保存しない。
- Galaxyでは同じVercel所有者のアカウントでサイトの入場を認証し、その後にテストAのメールログインを行う。VercelログインとYoga AIログインは別。外部の人へbypass URLを渡さない。
- 先生の名前・性格・指導言語を保存、logout、同じAでlogin、3値復元、PCとの相互復元、Bとの分離、PC/Galaxyの競合を順に実測。Google/LINEの検証は今回未実施。Galaxy/LINE内は人による検品待ちとして記録する。
- 検証前の不備は配信しない。配信後に制限不備があれば新stagingだけを停止し、本番には触れない。先生設定データは削除しない。

今回の実測結果・公開URL・各テストの最終成否はPR #27の更新コメントとローカル配信記録へ記載する。未確認はPASSにしない。


## Google検証の準備更新（2026-10-23）

ユーザーの「Google・LINE認証の検証を進めて。本番は変更せず」の依頼に基づく独立staging限定の準備。Google Cloudの専用project `yoga-ai-staging-auth`、専用Web clientを作成。ユーザー報告では対象は外部・公開状態はテスト・本人をテストユーザーに追加、AI agent分類はオフ。Google callbackは `https://htnouayipmqvpckppbzv.supabase.co/auth/v1/callback`。資格情報の値は記録しない。ユーザーが検証Supabaseへ入力しGoogleを有効化したと報告。Site URLと追加redirectは `https://yoga-ai-teacher-staging.vercel.app`。これは設定操作の報告であり、OAuth完了や保存復元のPASSではない。

独立builderの明示 `--google-oauth` のみでGoogleを有効にする。通常の検証Buildは引き続きメールのみ。接続先が指定の独立backendであることもGoogle gateの条件にする。LINE/Apple/LIFF/Edge/LLMは無効のまま。CSP/fetch/外部リンク拒否/Vercelアクセス制限を緩和せず、SDKのトップレベル遷移で独立Supabaseのauthorizeへ向かう。Googleでの操作は外部認証画面への遷移として必要だが、Google APIをサイトのfetch許可先に追加しない。

Playwrightは両Buildを検証し、Google opt-in時のみ有効・LINE無効、独立authorizeのproviderと戻り先originを通信遮断下で検査。実Googleとの認証は人による別検品。Googleログインの利用者はメールA/Bと同じ利用者とは仮定せず、その認証利用者で設定保存→logout→Google再login→名前/性格/指導言語復元を確認する。Vercel保護で復帰できなければ保護を解除せず原因調査する。LINEの専用channel/Secret/許可origin/Edge配置は未完了・未実測。本番・main変更なし、PR27 Draft、本番導入保留を維持。


## LINE配置前の具体案（2026-10-24・未実行）

専用provider 2005669880、channel 2012182245（Yoga AI Staging）。ユーザーがWeb app/2FA、callback、本人Adminを確認。専用SupabaseでLINE_CHANNEL_ID/LINE_AUTH_REDIRECT_ORIGINS/LINE_CHANNEL_SECRETを保存したと報告。値は取得・記録しない。チャネルDevelopingの読み戻しは未確認、公開しない。

2026-10-24の独立API読取: LINE2表はPGRST205/404（APIに未検出。SQL catalog確認とは別）、line-authはNOT_FOUND/404。`scripts/staging/prepare-line-auth.sql`は既存bootstrap確認・LINE表が既存なら停止・transactionで新規2表だけ作成・RLS/anon/authenticated/PUBLIC権限剥奪・service_role限定。SQL Editorの対象project-refがhtnouayipmqvpckppbzvであることを必ず照合してから適用。実行前のcatalog確認で既存ならこのscriptを実行せず差分調査。

承認対象: (1)独立DBの上記2表のみ新設、(2)同projectのline-authだけを配置、(3)独立VercelだけLINE opt-inへ更新。Edge配置は `supabase functions deploy line-auth --project-ref htnouayipmqvpckppbzv --no-verify-jwt`（CLIが認証済みの場合。未認証なら秘密値をチャットに出さずユーザーがログイン）。全Function deploy/全migration push/link済みproject暗黙指定は禁止。SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEYはこのprojectのplatform既定だけを使用、他環境からコピーしない。deploy前にentrypointと_shared/lineRedirect.tsのhashを保存し、本番変更なしを確認する。

配置後は許可外redirectが400・Locationなし、token/session発行なしを安全な拒否ケースで確認。許可startは302と専用channel/callback/stateを確認、raw state/URL/tokenを記録しない。匿名/通常JWTで2表の直接アクセス禁止を検品する。LINEのDeveloping利用者限定とVercel All Deploymentsを維持。Googleは既存stagingのみ維持、OAuthの利用者はGoogle/メールとは別accountであり自動結合しない。

LINEボタンは明示 `--line-oauth` と独立backend一致でのみ有効。CSP/fetchのEdge禁止は緩和しない（トップレベルstart遷移のみ）。模擬通信による遷移テストは実LINEログインPASSではない。未承認のためDB/Edge/公開は実行していない。rollbackは独立staging frontendを直前Googleのみ版へ戻し、LINEを無効化、DB2表・利用者設定を保持する。本番の変更・merge・公開は引き続き禁止。
