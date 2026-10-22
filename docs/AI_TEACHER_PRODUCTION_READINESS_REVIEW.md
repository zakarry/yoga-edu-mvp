# PR #27 本番導入前レビュー（2026-10-22）

再開基準main: `e213cbd0381ed4de904fa4474af06d23af25a87f`。レビュー開始head: `bf438d3f05e448bfd20d82aea8ca0f1c7b37675b`。GitHubでDraft/open、mergeableを確認。AGENTS.md、PRODUCT_REQUIREMENTS.md、REGRESSION_TESTS.md、USER_FEEDBACK_BACKLOG.mdに従う。DATA-01/02・FB-01を対象に、AUD-01/02、TIME-01/02、SAFE-01、数息観専用時計を維持する。

## 依存監査6件

6件は脆弱なパッケージの数であり、勧告の数ではない。監査時はHigh 5、Moderate 1、Critical 0。`npm audit --force`は実行せず、互換性を確認して更新した。

| パッケージ | 監査重大度 | 解決前→後 | 影響範囲と対応判断 |
| --- | --- | --- | --- |
| Vite | High | 5.4.21 → 6.4.5 | Windowsでのdev serverファイル保護回避、launch-editor関連など。開発・検証環境を守るため優先修正。Vite 8へ一括更新せず、既存SWC plugin 3.11.0のpeer範囲内の6系に更新 |
| esbuild | Moderate | 0.21.5 → 0.25.12 | 開発サーバー応答の他originからの読み取り。Vite依存を更新して解消。tsx側の0.28.2は変更なし |
| follow-redirects | High | 1.16.0 → 1.16.1 | リダイレクト時の認証ヘッダー除去の欠陥。LIFF→send-messages→LINE bot SDK→axiosのNode依存。通常のブラウザbundleには未収録でも、Node利用・将来のビルド処理のため修正 |
| nanoid | High | 3.3.12 → 3.3.20 | 特殊なサイズ指定時の無限ループ。PostCSSの間接依存で、製品からの直接呼び出しなし。範囲内更新で修正 |
| PostCSS | High | 8.5.13 → 8.5.31 | 攻撃者が制御するCSS/sourceMappingURLによるmapファイル参照。ビルド入力が境界。ビルド環境の機密保護のため修正 |
| source-map-js | High | 1.2.1 → 1.2.2 | 特殊なindexed source mapによるイベントループDoS。ビルド処理の可用性のため修正 |

根拠: [Vite](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)、[esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99)、[follow-redirects](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8)、[nanoid](https://github.com/advisories/GHSA-2v37-7h3g-55p8)、[PostCSS](https://github.com/advisories/GHSA-r28c-9q8g-f849)、[source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)。npm auditの他の同パッケージ勧告も修正版範囲で確認した。

更新後の`npm audit`は全重大度0件。package.jsonはViteの範囲だけ変更し、React・Supabase・LIFF・SWCのバージョンは変えていない。lockfileの差分は上記更新、Viteの新しいglob依存とesbuildの各OS版に限定。実BuildのRollup module graphでは上記6パッケージとLINE bot SDKはいずれも配信用JSのmodule数0。これは静的配信版の到達性の証拠であり、開発サーバーの安全やLINE実動作の証明ではない。脆弱性0も将来の安全保証ではない。

## 製品UIと外部環境の受入

独立Supabase `htnouayipmqvpckppbzv` への接続を固定したローカルBuildを使用。LLM・LIFF・地図は無効。テストAの既存セッションから製品画面の「変更する」を開き、名前を`製品UI検証A先生`、性格を`明るく励ます`、指導言語を`日本語`へ変更。「アカウントに先生設定を保存しました」の表示と設定欄の3値を実測した。その後、製品のログアウトボタンでアカウント表示と設定が消え、未ログイン表示になることを確認した。

本書作成時点の再ログインは、人によるテストAのパスワード入力待ちで未確認。実施後の最新結果はPRの受入コメントに記録する。パスワードをチャット・ログ・ファイルへ保存しない。

| 対象 | 現時点の証拠・制約 |
| --- | --- |
| 実GoTrue/PostgRESTのRLS・再ログイン | 先行検品18/18 PASS。サーバーgetUserで本人確認、他人SELECT/UPDATEは0件、INSERTは42501、設定/revision不変、A/B再ログイン復元。製品UIの新しい再ログイン確認とは別 |
| 製品UIでの保存 | 今回実測PASS（上記3値）。再ログインは上記の操作待ち |
| 競合防止 | 実Supabaseの二つの編集タブで古い入力の拒否・入力保持・同時更新の一方だけ成功・勝者の再読込を先行実測PASS。回帰テストで継続保護 |
| Google | 検証Authの公開settingsを読取確認: HTTP200、email=true、google=false、anonymous=false。実Googleログインは未確認。テスト用OAuth client・callback・担当テスト利用者の準備が必要 |
| LINE | 検証LIFF IDを空に固定、検証line-auth Edge/channel/LIFFは未整備。実LINEログインは未確認。未設定ボタンのエラーを製品永続化のFAIL/PASSへ置き換えない |
| 別ブラウザ | 前回Chromeでの復元は履歴としてPASS。今回の依存更新後の別ブラウザ・別端末は未確認 |
| Android・LINE内 | 操作可能なAndroid端末と限定HTTPS stagingがなく未確認。PCの390pxやUA偽装を代替PASSにしない。スマホの127.0.0.1はPCを指さない |

本番認証・LINEチャネル・既存Vercel環境変数は変更しない。OAuth検品は専用のテストoriginとテスト用provider設定を準備する別工程。同じproviderかどうかではなく同じSupabase user IDで設定が復元されることを検証する。別IDをメール類似で自動統合しない。

## 最終差分レビュー

- RLSは本人user_id限定のSELECT/INSERT/UPDATE/DELETE。UPDATEにはUSINGとWITH CHECK、テーブルにENABLE/FORCE RLS。anon/PUBLIC権限を取り消し、authenticatedの書込みは設定列だけ。user_id、revision、updated_atの任意更新は許可しない。FKはauth.usersで、他会員や管理者権限の更新を含まない。実DELETEは未実測で、UIの先生削除はpersona=nullの保存である。
- 読込みは確認済みの本人設定のみ。読込失敗を「設定なし」とせず、保存を禁止する。保存は本人ID・編集開始revisionで照合し、0行更新・作成競合を成功にしない。サーバーtriggerがrevisionを増やす。画面離脱・アカウント切替後の遅い応答は世代番号で無効化する。
- 旧`yogaTeacher`は未ログインのブラウザ設定として保持する。アカウント設定へは自動移行しない。ログイン中に旧personaへfallbackせず、会話contextのpersonaも本人の確認済み値に限定。設定prefsと既存ブラウザの成長履歴も分離する。
- My Yoga Memory・会話・身体情報・カルテ・成長履歴の全面的なアカウント隔離を今回のPASSに含めない。既存の同意・削除・旧履歴の扱いは別レビュー対象。
- 既存24コンテンツ・211素材・音声・実践タイマー・数息観Session・Knowledge・DBの既存テーブルの変更はない。保護fixtureの元hashは維持し、先生設定に関する限定差分の逆適用で元画面hashを検証する。
- 今回の追加修正は依存2ファイルとレビュー文書のみ。migration、Authコード、RLS、音声などの製品ロジックを追加変更していない。Vercelのmain/当該branch自動deploy抑止を保持する。

## 判定

**本番導入は保留。** 依存監査の既知6件は解消したが、製品UI再ログインの完了記録、OAuth・実機の受入範囲の決定、Bolt同期復旧または承認された公開経路とrollback可能性の確認が必要。PRをDraftに保ち、以下の手順は計画としてレビューする。未検品のproviderや端末を無条件にGOにしない。

## 本番導入・rollback手順（今回実行しない）

1. **承認とfreeze**: 最新main・PR head・CI・監査結果を再確認し、導入責任者と対象リリースcommitを固定する。個別にDB適用・merge・公開の承認を得る。本番backendのproject-refを管理者が確認し、検証projectと異なること、既存Auth/Edge/会員設定を変えないことを照合する。バックアップ/PITRの可用性と、直前の安定frontend artifactを確認する。
2. **DB事前確認**: read-onlyでauth.users、既存のpublic.ai_teacher_settings有無、同名関数・trigger・migration履歴を確認する。既存オブジェクトがあれば停止して差分調査し、DROPやCREATE IF NOT EXISTSで不一致を隠さない。書込み経路のある本番データをstagingへコピーしない。
3. **追加DBだけ先行**: 承認された`20261013000100_ai_teacher_settings.sql`一件の内容とhashを確認し、BEGIN/COMMITで一括適用する。失敗時はROLLBACK。既存profiles/privacy/consentsは触らない。`scripts/staging/bootstrap-teacher-auth.sql`は本番禁止。全migration一括pushは、本番UUIDを前提とする過去migrationを含むので禁止。この一件を適用したことをmigration履歴・担当者・時刻とともに記録する。履歴登録方式は管理者と事前に確定する。
4. **DB単独検品**: table列・制約・RLS・列grant・triggerを照合し、承認済み本番検品アカウントだけで本人の設定読書き、他人アクセス拒否、競合を確認する。一般会員IDを検品に流用しない。旧frontendは新しいテーブルを参照しないため、DB先行でfrontend未公開の状態を保てる。
5. **GitHub採用**: DB・受入ゲート完了後に別承認でDraftを解除し、最新mainとの最終差分・CIを確認してPRをmergeする。main直接push・force pushは行わない。自動deploy抑止は維持する。mergeのcommit IDを記録する。
6. **公開前照合**: 固定commitからクリーンBuildし、成果物と設定名の一覧を記録する。公開先の実ソース全内容がそのcommitと一致することを確認する。BoltのSynced表示だけでは公開しない。Bolt同期が未復旧なら公開を止め、GitHub直結方式は別承認でproduction backend/認証/アクセス制御/rollbackを先に設計する。今回のlocalhostや未接続Readyを本番として使わない。
7. **明示承認後の公開**: 既存の承認済みフロント公開経路だけを使う。DB/Edge/Secret/認証/DNS変更を同時に混ぜない。少数の担当検品アカウントで保存、再ログイン、他人分離、競合、Google/LINEの同一ID復元、既存実践・管理/MFA等の主要導線を実測し、判定と担当者を記録する。検品範囲外をPASSにしない。
8. **障害時の判断**: データ漏えい・他人設定の更新・再ログインでの消失・重大な既存機能破壊なら公開拡大を止める。即時に直前の安定artifactを同じ承認済み経路で復旧する。frontend rollbackでは追加テーブル・設定データ・RLSを保持し、DROP/CASCADEを行わない。DB自身のアクセス制御に欠陥がある場合はfrontend rollbackだけで止まらないため、事故対応責任者の承認下でこの新テーブルのクライアント書込み/アクセスを遮断する別DB対応を行う。auth.usersや既存会員・Edgeを巻き込まない。
9. **DB適用後・公開前の中止**: 新テーブルはRLS付きで保持し、旧frontendを続行する。修正版をstagingで再検証し、再承認を待つ。既存設定の復旧は本人所有権とrevisionを照合し、ブラウザ保存を推測で一括取り込まない。

検証結果の最新追記はPRの受入コメントに記録する。ソース・依存が変われば型・Build・全回帰・実践17件・設定3件とActionsを再実行し、今回は依存更新後の全項目を確認する。
