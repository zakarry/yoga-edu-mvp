# 品質基盤の検証記録 — 2026-10-10

基準main `ac06d9457418a509641c2296e79a44da7aeb47b3`、作業ブランチ `codex/quality-foundation-20261010`。
GitHub実照会: PR #10 open/Draft/未merge、PR #11〜#14 merged。最新ソースと原指示書・追加受入E〜Jを照合。製品/DB/音声assetの変更なし。

| 検証 | 実測結果 | 制約 |
| --- | --- | --- |
| TypeScript `npm run typecheck` | PASS | フロントtsconfig範囲 |
| `npm run build` | PASS | 既存Supabase静的/動的import、500kB超chunk warningあり |
| `npm run test:audio` | 4/4 PASS | 実runtime＋mock音声＋React SSR。聴取ではない |
| `npm run test:contracts` | 8/8 PASS | 新規: subtitle/ended、停止遅延callback、DEMO順/画像、Cat/Cow、Box、腹式、資格、catalog監査 |
| camera既存suite | 16/16 PASS | 模擬device、Android/LINE実映像ではない |
| directory既存suite | PASS | 40 fixture通常/DEMO/旧診断snapshot非破壊 |
| Deno Edge release suite | 22/22 PASS | 20分類＋prod/preview実entrypoint。local auth stub、通常LLM/usage呼出0。本番deploy/実LLMではない |
| 旧breathwork script | FAIL | 腹式exhaleの旧文言期待。旧suite未移植として残す |
| 旧susokukan script | FAIL | Sessionソース不存在。旧suite未移植として残す |

Node 24.15.0、Deno 2.9.6、Windowsで実行。CIはNode22/Linuxと検証と同じDeno2.9.6を用い、PR上のActions結果は別途確認。Denoは `--node-modules-dir=none` でEdge固定SDKをフロントnpm依存と分離し、動的import用read権限を付与。初回はread/SDK解決不足を検出し、CIコマンドを修正して22件再実行PASS。
新DEMO画像テストの初回はテスト側の画像ディレクトリ仮定で失敗した。実ConcretePose.image/stagesを読むよう直し、存在検証PASS。製品をテストに合わせて変更していない。

## 受入残件
音声「はきます」の人によるAndroid試聴、最新実機同期、先生設定OAuth再ログイン、講師公開編集、対話スクロール/診断CTA全画面統合、最新実LLM品質はこのPRの自動PASSに含めない。回帰表・バックログへ明記。

## 保護とrollback
変更は文書、PRテンプレート、CI、npm scripts、新規testのみ。src/public/supabase/DB/RLS/認証/MFA/LINE/会員データ/カメラ/実践ロジック/AI Engineの差分なし。merge・Publish・Edge deploy未実施。
このPRだけのrevertで品質基盤変更を戻せる（製品やデータは触らない）。既存audioジョブIDを維持。required checks/branch protection設定は変更しない。

Deno依存lockも記録し、Edgeの固定SDK解決を再現可能にする。Functionの製品ソース・設定には変更しない。
