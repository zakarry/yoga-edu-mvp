# Yoga AI 本番バックアップ・復旧・フロント切り戻し手順

更新: 2026-11-02。対象: PR #27 / DATA-01・FB-01・UI-01。AGENTS.md、PRODUCT_REQUIREMENTS.md、REGRESSION_TESTS.md、USER_FEEDBACK_BACKLOG.mdを参照。**本番導入HOLD・PR Draft**。本書は計画であり、復元・migration・merge・Publish・DNS・Edge・Secret・認証設定変更の許可ではない。

## 根拠と確認レベル

- 対象本番: Bolt project `github-kchkczya` / `yogai.net`。独立staging `htnouayipmqvpckppbzv` と区別する。
- 2026-10-24付Larin正式回答の内容を、利用者が2026-11-02に提示した要約に基づき記録。回答原文・サポート側の実バックアップ一覧は今回再取得していない。一般的なSupabaseプラン仕様より、この管理DB固有の回答を優先する。古い計画書のPITR・隔離復元候補は、このBolt本番では非適用とする。
- 最新main `e213cbd0381ed4de904fa4474af06d23af25a87f`、作業開始PR head `ca4d9304c5c5ea16038cbfb83ac0668dd06a9c47`。main保護/DraftをGitHubで確認。main SHAは公開中artifactのSHAを意味しない。

## Bolt-managed DBの確定した復旧制約

| 項目 | 正式回答の条件 | 運用上の扱い |
| --- | --- | --- |
| 自動取得 | 毎日、約08:24 JST | 予定時刻。成功した日時と同一視しない |
| 保持 | 30日 | 実在・成功・復旧可能なbackup IDを変更前に確認 |
| 対象 | Postgres全体 | public/auth等のDB内データと、外部設定・Storageバイナリを区別 |
| 対象外 | Storage実ファイル、Edge Functions、Secrets、認証設定、ソースコード | 下の別系統の保全台帳が必要 |
| 実行者 | Boltサポートへの復旧依頼が必要 | 利用者/エージェントのボタン操作で復旧可能とは扱わない |
| 復旧方式 | 本番DB全体をバックアップで置換 | 個別テーブルだけ救済する操作ではない |
| データ損失 | 復旧点後の書込みは失われる | 会員登録・本人設定・実践・同意等、先生表以外も影響 |
| 非対応 | 個別テーブル復旧・隔離復元・PITR | 利用できる前提の旧計画は廃止。実行・代替保証をしない |
| 可用性 | 復旧中はDB利用不能 | 停止時間とサポート応答時間は未確認。即時復旧を約束しない |

**最新成功日時は未確認**。11/02の取得予定から11/02や11/01を成功扱いしない。08:24 JSTはUTCでは前日23:24頃だが、これも予定の換算にすぎない。必要な読取証拠は対象project、backup ID、完了/成功日時（timezone付き）、復旧点、成功状態、保持期限。認証済みの本番管理元バックアップ一覧/APIは現状利用できず、既存Bolt DB Advancedにも前回確認時は一覧がなかった。stagingの一覧で代用しない。次は既存Larinスレッドへ、情報照会だけで最新成功metadataを確認する。新たな返信送信は明示許可または本人操作で行う。

RPO評価は「事故/停止時刻−確認済み復旧点」を基本に、バックアップ以降の全本番書込みを評価する。正常な日次取得だけでも最大約1日分になり得るが、失敗や未確認ならさらに古くなる。RTOは復旧依頼・サポート待ち・DB停止/置換・検品を含み未測定。失ってよい期間や停止許容時間は利用責任者が明示承認する。**DB全置換を通常のPR rollbackに使わない。**

## GitHub mainを正本にしたフロントrollback（未実行）

Bolt Version History/Project Backupsからの復元はDBを戻さず、main保護との同期不一致を起こし得る。GitHub正本を古いBolt copyで上書きする方法、保護解除、force push、main reset、再接続/再importを標準復旧手順にしない。同期問題はFB-15として継続する。

### 公開前に作るリリース台帳

| 必須フィールド | 現状 |
| --- | --- |
| last_good_main_sha（正常な公開版に対応するmain履歴のcommit） | 未確定。現在のmain e213cbdを推測で入れない |
| 公開artifact ID / URL / 全配信ファイルhash / 作成・検品時刻 | 本番対応未確定。root HTML/JS/CSS3件の比較hashだけでは不足 |
| BuildのNode/npm版・lockfile hash・設定名/安全なversion参照 | 本番artifactとの対応未確定。Secret値は含めない |
| 本番host/project/domainと現行・直前artifactの対応 | Boltが現行。既存VercelのREADYはyogai.net用の復旧版ではない |
| 復旧の実行者・個別承認・正常判定・失敗時連絡先 | 公開前に確定する |

### 通常手順

1. 障害対象をfrontend/新先生表の権限/DB全体に分け、公開を止めて失敗版SHAと配信IDを記録する。操作は事故時の別承認後。
2. GitHubの現在mainと、台帳の検品済みlast_good_main_shaを取得。main履歴に含まれるcommitか照合する。Boltの作業copyを正本にしない。
3. 最新mainからrollback専用branchを作り、承認したfrontendファイルだけを正常版へ戻すPRを作る。例えば `git restore --source=<verified_good_main_sha> -- <reviewed_frontend_file_list>` はそのbranch内だけで行う。未確定placeholderのまま実行しない。
4. PR全体の一括revertでDB migration/RLS/Edge/認証や依存脆弱性修正まで戻さない。追加先生テーブル・既存データ・migration履歴を保持し、旧frontend互換性をレビューする。
5. クリーンinstall→型→全回帰→Build→関連Playwright/Actionsを検査し、競合/本人分離/再ログインを独立stagingで確認。過去の正常版でも既知脆弱性の再導入を見逃さない。
6. **別のmerge承認**で保護されたmainへ通常PRとして採用し、新しいmain SHAを正本にする。自動配信抑止は維持。
7. **別の公開承認**後、新main固定Buildまたは台帳で検証済みの対応artifactを、承認された同じ本番経路だけに配信する。Bolt経由なら単一session・適用source hash一致を再確認。不一致なら停止。今回この経路はまだ検品済みではない。
8. 配信ID/hash、先生設定・同一認証利用者復元・他人拒否・競合・既存主要導線を確認して記録する。DB/Storage/Edge/Secret/Authをフロント復旧に混ぜない。

緊急に既存artifactへ先に切り戻す方法は、同一hostの有効な正常artifact、権限と手順、mainとの一時的差分と追認PRが事前に承認/検証済みの場合に限る。Vercel Instant RollbackはそのVercel project内の配信操作で、Bolt本番の復旧やDB復元にはならない。実復旧成功は未確認。

## 本番DBの全置換が必要な事故（未実行）

1. 責任者が、確認済みbackup ID/復旧点・対象本番DB・全置換の範囲・失われる期間/書込み・停止時間未確定・対象外資産をレビュー。全置換と損失について個別承認を得る。
2. 破損原因を切り分け、書込み抑止/メンテナンスをどう行うか別承認で確定する。サイトを戻すだけで直接API書込みが止まるとは考えない。変更前の観測記録は安全に保管し、会員データをチャット/PRへ貼らない。
3. Boltサポートへ特定backup IDの本番全置換を依頼。**最新へ戻してほしい等の曖昧な依頼は禁止**。隔離/PITR/表単独の依頼を利用可能手順として案内しない。今は依頼しない。
4. 復旧中はDB利用不能として対応。完了後にDB schema/RLS/grants、auth系DBデータ、migration履歴、先生設定/既存記録の整合を検品する。復旧点が新migration前ならfrontendとの互換性も再確認し、勝手に再migrationしない。
5. 次節の対象外資産を照合し、欠落とDB metadataとの不整合を解決する。復旧後の設定変更・再配置には別承認が必要。検品と責任者承認後に利用を戻す。想定損失と実損失、停止時間を記録。

## DB対象外の保全と復旧（今回は手順整備のみ）

| 対象 | 事前に保全するもの・安全な置き場 | 復旧・検品の手順と制約 |
| --- | --- | --- |
| Storage実ファイル | 許可された管理者がbucket/object ID、version、サイズ/hash、content type、アクセス設定と実バイナリを暗号化・アクセス制限付きの別保管先に保全。保存期間・削除履歴をDB30日と整合させる | 承認後、対応versionを元のID/pathで戻しhash/ACLを検品。DBの古いmetadataと実objectの新旧差を照合。DB復元だけではバイナリは戻らない。ファイルの実取得/復旧は未実施 |
| Edge Functions | 実配信版の全entrypoint/shared/import map/lock/runtime/verify_jwt設定、関数名・配信version・SHAとGitHub commitの対応。値を含まない設定名台帳 | GitHubの検証済み版を復旧対象として照合し、必要な関数だけ別承認で配置。DBを戻しても自動的にEdgeは戻らない。mainソース一致≠実配信コード一致 |
| Secrets | 名前・用途・対象環境・所有者・保管vaultのversion参照・再発行手順/依存先。値は本人管理の安全なvaultだけ。Git/PR/log/画像に値を保存しない | 必要時は本人が適切な環境へ入力。紛失/失効なら依存先で再発行・rotation/旧資格情報失効を別承認。新旧versionの整合・機能だけ検品。DB復元では戻らない |
| 認証設定 | Site URL/redirect allowlist、Google OAuth client/callback/公開状態/テスト利用者、LINE provider/channel/状態/callback、メール/SMTP、signup/MFA等の設定名と非Secret値。資格情報は上のvault | DB内authデータと外部provider設定を別管理。Google Cloud/LINE等の一致と、本人ID・再ログインを検品。変更は環境別・個別承認。staging設定を本番へコピーしない |
| frontend/ソース | GitHub保護mainのcommit、lockfileとBuild条件、対応する完全な配信artifactを安全に保全 | 上のfrontend手順。Bolt Version History/DB snapshotで代用しない |

これらは「保全手順を設計済み」であり、実バックアップ作成・保管先の実在・復旧の実証は未確認。現在の承認では本番のSecret値取得、会員/Storage内容の新規export、関数download/再配置、認証変更をしない。復旧先へ本番データをコピーする想定の隔離訓練も、サービス非対応かつ未承認。今回は情報に基づく机上確認に留め、実DB復旧PASSとは扱わない。

## 導入順とGO条件

0. 最新成功backup metadata・全DB置換のリスク・責任者の許容損失/停止を確定。対象外資産の保管/復旧担当とfrontend正常artifactを確定。同期問題は独立課題として開いたまま扱う。
1. 読取で既存table/trigger/migration履歴との衝突を確認。導入担当が本番projectと別系統保全を照合。
2. **DB適用の別承認**後、`20261013000100_ai_teacher_settings.sql`一件だけをtransactionで適用・DB単独検品。既存会員/認証や過去migration一括適用は禁止。失敗は未commit transactionのROLLBACKで扱い、全DB復元を通常手段にしない。
3. **mergeの別承認**後にDraft解除・最新CI確認・保護mainへ採用。今はDraft維持。
4. 固定mainのソース/Build/artifact/設定対応を照合し、**公開の別承認**後に同じ承認経路で公開。DNS・Edge・Secret・Auth変更は独立承認。公開先未確定なら公開しない。
5. 限定検品→責任者のGO判断。異常時は原因別の上記復旧判断。DB適用後の中止では新先生表/設定/RLSを保持し旧frontendを継続する。

**現判定HOLD**: 正式回答で仕様は判明したが、最新成功backupの実在日時、許容損失/停止の責任者合意、対象外資産の実保全、公開版commit/artifactと復旧経路の実証が未完了。隔離/PITRが無いことを未実施PASSへ置き換えない。

## 検証済み範囲と未確認を分ける

- 10/24利用者実機報告PASS: Google PC保存→logout/relogin3値復元、PC→Galaxy Chrome3値復元。LINE PC同手順、Galaxy Chrome、LINE内ブラウザの実LINE login/logout/relogin3値復元。先行実JWT18件/RLS/CASと競合表示検品は別証拠。
- 10/24単一Bolt sessionの714ファイルfingerprintは当時のmain作業ソース一致だけPASS。将来の複数session・main保護との同期不一致は別問題として維持。本番の公開版・Edge・環境設定は対象外。
- 11/02読取: 同staging配信ca4d930、匿名302でVercel SSO、Google/email有効、LINE許可外URL400/Locationなし。新しい実OAuthログイン成功の証拠ではない。
- 11/02読取: 本番HTML/同origin JS/CSSのhashは10/24記録と一致。www→site-dns.bolt.host。既存Vercel2サイトは3d2c0b1のまま。完全な公開artifact/commit対応・切戻し成功は未確認。
- 未確認: Google OAuthをLINE内で行う経路、LINE内password manager入力問題、実DELETE、製品全体のMemory/成長履歴隔離、本番での実認証/復旧。今回の先生設定3値PASSに含めない。

## 根拠リンク

- [Bolt project復元はDB復元と別](https://support.bolt.new/managing-projects/rollback-backup)
- [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback)（当該project内だけ。本番Boltへの適用保証ではない）
- [Supabase DB backups](https://supabase.com/docs/guides/platform/backups)（一般資料。管理Bolt DBの保持/PITR等はLarin個別回答を優先）
- [実LINE内受入](https://github.com/zakarry/yoga-edu-mvp/pull/27#issuecomment-6370626693)、[714ファイル一致](https://github.com/zakarry/yoga-edu-mvp/pull/27#issuecomment-6371045913)、[公開ファイル指紋](https://github.com/zakarry/yoga-edu-mvp/pull/27#issuecomment-6371121669)
