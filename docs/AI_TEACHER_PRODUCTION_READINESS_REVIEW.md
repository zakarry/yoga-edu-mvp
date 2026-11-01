# PR #27 本番導入前レビュー

最新更新: 2026-11-02。Larinの10/24正式回答（利用者提示要約）を反映。[本番復旧手順](PRODUCTION_RECOVERY_RUNBOOK.md)を運用上の正とする。**HOLD・Draft維持**。下の依存監査は10/22時点の履歴であり、11/02の再監査0件を意味しない。

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

## 11/02の新規依存勧告と限定修正

クリーンinstallでHigh1件を新たに検出。`follow-redirects`1.16.1に対する[GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p)は10/25公表の別勧告で、10/22の0件記録を取り消すものではない。cross-realmのsensitiveHeaders配列が捨てられるNode処理の問題。LIFF→send-messages→LINE bot SDK→Axiosのoptional間接依存で、勧告自体もAxios正規化経路の再現を主張していない。製品の実漏えいを観測したとは扱わない。

修正版1.16.2へlockfileの該当packageのversion/resolved/integrity3行だけ更新。package.json/他package/認証コードは変更なし。本番・stagingへ再配信していない。更新後の監査/型/全回帰/BuildとCIは、今回の結果記録に成否を分けて記載する。

## 製品UIと外部環境の受入（11/02の証拠整理）

| 対象 | 証拠と判定範囲 |
| --- | --- |
| 実JWT/RLS | 先行18/18 PASS。本人・他人拒否・0行/42501・A/B復元。実DELETE未実測 |
| 製品UI | メールAの保存/logout/relogin3値復元は先行PASS。Google/LINEの実機結果とは別 |
| 競合 | 実Supabase CAS/同時更新の先行PASS。修正版PC/Galaxyでメッセージ表示・入力保持・勝者保護・reload復元は利用者報告PASS |
| Google | 10/24 PCでGoogle login/save/logout/relogin3値復元、同アカウントGalaxy Chrome復元PASS（利用者報告）。11/02設定読取で有効。11/02実ログインを再実行した証拠ではない |
| LINE | 10/24専用channel/Edge/独立DBでPC/Chrome Galaxy/LINE内実LINE login、PCとLINE内logout/relogin、3値復元PASS（利用者報告）。11/02許可外redirect400/Locationなし |
| 独立配信 | 11/02配信source ca4d930、匿名SSO302、独立backend継続。最新の文書だけを同じBuildに再配信したとは扱わない |
| 本番公開経路 | 11/02 HTML/JS/CSS fingerprintは10/24と一致。完全artifact/固定commit対応・安全なfrontend rollbackの実証は未確認 |
| Bolt同期 | 10/24の単一session714ファイル一致は当時のソース限定PASS。Version Historyとmain保護の同期不一致はFB-15として維持 |

Google/LINEを自動統合せず同一認証利用者での復元が基準。Google OAuthのLINE内経路・LINE内自動入力・製品全体のMemory隔離等を未確認のままPASSにしない。詳細/証拠リンクは[本番復旧手順](PRODUCTION_RECOVERY_RUNBOOK.md)参照。

## 最終差分レビュー

- RLSは本人user_id限定のSELECT/INSERT/UPDATE/DELETE。UPDATEにはUSINGとWITH CHECK、テーブルにENABLE/FORCE RLS。anon/PUBLIC権限を取り消し、authenticatedの書込みは設定列だけ。user_id、revision、updated_atの任意更新は許可しない。FKはauth.usersで、他会員や管理者権限の更新を含まない。実DELETEは未実測で、UIの先生削除はpersona=nullの保存である。
- 読込みは確認済みの本人設定のみ。読込失敗を「設定なし」とせず、保存を禁止する。保存は本人ID・編集開始revisionで照合し、0行更新・作成競合を成功にしない。サーバーtriggerがrevisionを増やす。画面離脱・アカウント切替後の遅い応答は世代番号で無効化する。
- 旧`yogaTeacher`は未ログインのブラウザ設定として保持する。アカウント設定へは自動移行しない。ログイン中に旧personaへfallbackせず、会話contextのpersonaも本人の確認済み値に限定。設定prefsと既存ブラウザの成長履歴も分離する。
- My Yoga Memory・会話・身体情報・カルテ・成長履歴の全面的なアカウント隔離を今回のPASSに含めない。既存の同意・削除・旧履歴の扱いは別レビュー対象。
- 既存24コンテンツ・211素材・音声・実践タイマー・数息観Session・Knowledge・DBの既存テーブルの変更はない。保護fixtureの元hashは維持し、先生設定に関する限定差分の逆適用で元画面hashを検証する。
- 今回の追加修正は依存2ファイルとレビュー文書のみ。migration、Authコード、RLS、音声などの製品ロジックを追加変更していない。Vercelのmain/当該branch自動deploy抑止を保持する。

## 判定（11/02）

**本番導入HOLD。PR #27はDraft維持。** 認証/端末の確認済み範囲は上表の通り。DBのバックアップは毎日約08:24 JST・30日保持・Postgres全体だが、現在の最新成功日時は未確認。復旧はサポートによる本番全DB置換で、復旧点後の全書込み消失とDB停止を伴う。個別表/隔離復元/PITRは不可。Storage実ファイル・Edge・Secrets・認証設定・ソースは別保全が必要。正式回答は本番変更や損失の承認ではない。

## 本番導入・rollback手順（未実行）

1. 最新成功backup ID/完了・復旧点日時/保持期限を管理元に確認し、失われ得る全会員更新と停止許容を責任者が明示承認。日次予定を成功証拠にしない。対象外資産と公開正常artifactの保全台帳を確定する。
2. 本番table/trigger/migration履歴との衝突を読取確認し、**DB適用の別承認**後に設定専用migration一件だけ適用。staging bootstrap/LINE新設SQL/全migration pushを本番へ使わない。既存会員/認証設定に触れない。
3. DB単独検品・最新CI・独立staging受入後、**別のmerge承認**で保護mainへ採用。今はDraftのまま。
4. GitHub main固定のBuild/source/artifact/設定を照合し、**別の公開承認**で承認済み経路だけへ公開。DNS/Edge/Secret/Auth変更はさらに個別承認。本番経路が未検証なら停止。
5. frontend rollbackは最新mainから専用branch/対象frontendだけの復旧PRを作り、型/全回帰/Build/Playwrightを検品→別merge承認→固定mainから別公開承認。DB・新表・保存設定・RLS・依存脆弱性修正を一括revertしない。Bolt Version Historyでmainを古い内容へ戻さない。
6. 本番DB全置換は通常のrollbackに使わない。必要な事故時だけ、特定backup ID・全置換・書込み損失・DB停止を責任者が別承認しサポートへ依頼。隔離復元やPITRを可能な選択肢にしない。復旧後はDBと対象外資産の整合・本人分離・既存認証/実践を検品する。
7. DB適用後に公開を中止した場合は新先生表/データ/RLSを保持し旧frontendを継続。DROP/CASCADE・ブラウザ設定の推測移行は禁止。

具体的な承認境界、release台帳、Storage/Edge/Secret/Auth別復旧、RPO/RTO評価は[PRODUCTION_RECOVERY_RUNBOOK.md](PRODUCTION_RECOVERY_RUNBOOK.md)に定義。今回実行するのは文書更新・読取・必須検査だけ。
