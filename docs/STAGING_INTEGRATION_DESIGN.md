# Vercel統合staging設計 — 実装・接続前

2026-10-13。基準main `93eef8446e635b821ed537836f8b4129c5bd907e`。AGENTS、PRODUCT_REQUIREMENTS、REGRESSION_TESTS、USER_FEEDBACK_BACKLOGを参照。DATA-01/SAFE-01/LINE-01を保護。本書は設計であり、隔離が実装済みという証拠ではない。

## 利用する環境と境界

既存 `yoga-edu-mvp` の専用Previewブランチを第一候補とする。現在のReadyは旧main `3d2c0b1…` の限定フロント検品用であり、PR #25のUI公開版ではない。もう一方 `yoga-edu-mvp-source-mobile-cta-higher` は比較用に維持。既存調査時点では両件ともSupabase/LIFF/LLM接続変数がなく、統合検品は成立しない。今回管理画面の設定を再変更・再照会していない。

統合stagingは **Vercel Preview → 独立Supabase検証プロジェクト → 同プロジェクト内のAuth/DB/Storage/Edge** とする。本番DBのコピーではなく、スキーマと合成人物・架空カルテ・検証用Knowledgeのみ。検証用Google OAuth client、LINE Login channel/LIFF、検証用利用者/管理者/MFAを分離する。プロジェクトの新設・migration・Function配置・認証設定は将来の別承認工程。現状は全て未実施。

本番DBへの接続＋「保存ボタンを押さない」は不可。`line-auth/start` は `line_auth_states` をinsertし、診断/実践/学習/Memory/管理操作も書く。AI先生Functionの利用記録やservice-role経由の書込みも隔離対象。read-only RLSだけでAuth・Edge副作用を防げない。

## 環境変数台帳（値は記録しない）

| 名前 | 将来の設定場所・用途 | 開始条件 |
| --- | --- | --- |
| VITE_SUPABASE_URL | 専用Previewブランチ、検証プロジェクトURL | project-refが本番と異なることを非Secret情報で照合 |
| VITE_SUPABASE_ANON_KEY | 同上、検証プロジェクトの公開クライアントキー | サーバーで所有者RLS/ロール認可を検査。service-roleをブラウザへ入れない |
| VITE_LINE_LIFF_ID | 同上、独立した検証LIFF | 本番公式LINE入口・既存LIFFは変更しない |
| VITE_AI_TEACHER_LLM_ENABLED | 初期false、隔離確認後のみtrue | 実LLM費用上限/利用者allowlist/ログPII抑制 |
| VITE_AI_TEACHER_TEST_FUNCTION | Vercel検証先切替として使用しない | 現行コードはimport.meta.env.DEV条件。Build版では指定してもai-teacher-explanationへ接続 |
| VITE_GOOGLE_MAPS_API_KEY | 必要時だけPreview用制限キー | 検証originのreferrer制限。既存Production用値をコピーしない |
| SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY | 検証Edge側のみ | 各FunctionのDB接続先も検証projectに固定。値の表示・コピー・commit禁止 |
| LINE_CHANNEL_ID / LINE_CHANNEL_SECRET | 検証line-authのみ | 検証channel用。Google provider資格情報も検証Auth側のみ |
| LLM provider資格情報 | 検証Edge側のみ | 実FunctionのDeno.env参照名を配置前に台帳へ追加。VITE_に入れない |

Vite変数はBuild時にクライアントへ埋め込まれる。変数変更だけで既存Readyが変わったと扱わない。Preview branch scopeを指定し、Productionへの継承・共有変数を確認する。[Vercel環境変数](https://vercel.com/docs/environment-variables)。

## 認証・LIFF・接続

- 安定した専用Preview originを先に決める（未割当）。Google: 検証Supabase `/auth/v1/callback` を検証OAuth clientの戻り先にし、検証AuthのSite URL/redirect allowlistにそのoriginを明示。現行 `auth.ts` はwindow.location.originへ戻る。任意Preview wildcardを許可しない。[Supabase redirect](https://supabase.com/docs/guides/auth/redirect-urls)。
- LINE OAuth: 検証 `/functions/v1/line-auth/start?redirect_to=<staging origin>` → 検証channel → 検証 `/functions/v1/line-auth/callback` → 同origin。state/consume/profile/session作成は全て検証DB。redirect_toの厳密allowlist・期限・再利用拒否をサーバーで確認する工程が必要。
- LIFF: 検証LIFF endpointを安定originへ、必要最小scopeとテストメンバーのみ。endpointとURL prefixの整合性を確認。本番リッチメニューは維持。[LINE LIFF API](https://developers.line.biz/en/reference/liff)。
- AI先生: Build版は検証projectの `ai-teacher-explanation` を使う。名称がproduction相当でも接続projectが隔離される。previewというFunction名だけで安全とは判定しない。管理画面は検証 `admin-dashboard`、カルテは検証DB。実entrypoint・依存RPC/Storage/外部通知も棚卸しする。

## 防止策と開始ゲート（今後実装）

1. Buildをfail-closedにするpreflight: 承認されたstaging origin/project-ref/LIFF IDと一致しない設定、Productionキー、未定義設定を拒否。静的bundle/設定に本番backend hostnameがないことを検査。これは現状の製品に未実装。
2. テストrunnerのネットワークallowlistで本番DB/Auth/Edge/Storage宛をmethodに関係なくabortし、違反0を記録。ブラウザだけのblockを人の検品全体の防壁としない。backend Function内部の宛先も個別検査。
3. Vercel Deployment Protectionで担当者限定。OAuth/LINE内ブラウザがProtectionの認証を通れない場合は公開解除せず、専用入口のアクセス方式を別設計。プランで利用可能な方式は未確認。[Protection](https://vercel.com/docs/deployment-protection)。Supabase側のJWT/所有者RLS、管理者ロール、MFA、非admin403は独立必須。
4. サーバー資格情報はRLSを迂回し得るため、検証資格情報＋検証DBへの固定とFunction認可が必要。[service-roleの境界](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z)。本番の資格情報・個人データは搬入しない。
5. 隔離証拠をレビュー後、Google/LINE Aユーザー設定→logout→再login→維持、Bへの漏えい0、読込失敗時上書き0、カルテ未開始/中止0・完了1、一般/管理/MFA権限、LLM Safety/provider0条件を順に実測。合成人物以外は使わない。

承認前は新デプロイ・env/Auth/DB/Edge/Secret設定をしない。既存Readyの限定検品とローカル標準17件は継続可。今回作業ブランチのVercel自動デプロイもソースguardで停止する。復旧は将来の独立承認後にPreviewだけを対象にする。

## 公開障害とサポート

Boltの実ソース不一致は未解消。問い合わせ送信済み。本工程でGmailの `in:anywhere after:2026/10/12 (from:bolt.new OR from:stackblitz.com)` を更新し、該当メールなしを確認。検索範囲内では回答・問い合わせ番号を確認できず回答待ち（他の送信元/チャネルまで不存在とは断定しない）。回答が届いた際は取得commit/適用snapshot/未送信queue/WebContainer timeoutの説明と証拠を追記する。隔離構成・P0永続化・実OAuth/実LLM/実機検品・CIと公開gate連携が未完了で、統合staging開始・本番移行は保留。
