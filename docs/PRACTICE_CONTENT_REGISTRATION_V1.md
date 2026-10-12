# Practice & Knowledge Core v1.0 — 共通コンテンツ登録仕様

作成: 2026-10-12。基準main: `1cbe4e4b7ff1c4728b26c852258bbf0e6b49eb9b`（PR #21 merge）。
優先根拠: AGENTS.md、PRODUCT_REQUIREMENTS.md、REGRESSION_TESTS.md、最新mainと明示ユーザー指示。これは追加・移行時の登録/検品仕様。DB schema、公開管理画面、全種共通schedulerの実装ではない。

## 採用状態と適用範囲

腹式 `abdominal-breathing`（PR #20）と立ち木 `vrksasana`（PR #21）の読取契約をmainへ採用。catalogと既存cueの参照をそのまま保ち、既存runtimeへ同一の出力を渡す方式が2件で成立。実機品質や全種移行済みの証明ではない。
既存24定義（active22）＋別枠太陽礼拝は一括変換しない。内容の所有者は既存catalog/専用Session。登録票はそれらへの参照と検品証拠を管理し、原稿・時間を第二の実行定義へ複製しない。文書内の例を実音声生成済みと扱わない。

## 共通登録項目

「必須」は登録票の必須項目。未調査の値は `unknown`、該当しない場合は理由付き `not_applicable`。空欄、推測値、未確認をPASSで埋めない。新規登録で必須検品が未完なら公開を保留。既存移行で不足があれば履歴と不足を残し、既存content/status/挙動を勝手に変更しない。

| ID | 共通項目 / 登録内容 | 対応する現行データ / 検品条件 |
| --- | --- | --- |
| REG-01 | stable practiceId、kind（asana/breath/meditation）、schemaVersion、contentRevision、catalogPath、baselineCommit、検証head、担当者・レビュー日 | `PracticeDefinition`の現行項目。ID重複不可、aliasで別実践を上書きしない。意味が同じかは別照合 |
| REG-02 | 日本語名称、名称読み、サンスクリット/英語名（任意）、aliases、流派/分類（該当時） | `nameJa/nameSanskrit/nameEn/aliases/category/tradition`を参照。名称読みは未実装の検品票項目。表示名と発音を別記録 |
| REG-03 | 難易度、想定経験、初心者可否、強度、補助具、軽減方法、移行の複雑さ、判断根拠 | asana `planner`、breath `safety`を参照。難易度と強度を混同しない。統一難易度UI/型は未実装。根拠不足ならunknown、初心者可を推定しない |
| REG-04 | cueId、段階/side/round/phase、displayText（字幕）、speechText（音声読み）、audioKey、ファイルpath/hash/形式/長さ、原稿revision、生成方法/voice/版/日、fallbackの読み | 既存builder/manifest/assetへ参照。表示「吐きます」→音声「はきます」。同じかな原稿を生成/fallbackで使用。存在/hash/原稿一致と人の正読試聴は別判定 |
| REG-05 | 字幕の切替条件、段階順、句読点/全文、Visualとの対応 | cueStart/audio.currentTime等の実経路を明記。前音声中の先走り不可。字幕をかな表示へ勝手に変更しない |
| REG-06 | runtime名、時計の所有者、時間方式、予定保持/フェーズ秒、案内時間、実経過、残秒、初期表示、完了条件 | 数値の単位は秒で記録し、画面の既存書式を維持。案内予定数値と保持残秒を区別。既存例: 立ち木0:30→0:29、数息観5:00。全実時間=保持合計としない |
| REG-07 | 左右の有無/順序、各保持秒、切替cue、sideとVisualの対応 | 非左右はnot_applicable。立ち木は右→左、保持均等、案内/切替は保持を消費しない。時間変更は独立改善PR。鼻孔交替は脚の左右保持と別方式として設計 |
| REG-08 | Visual形式、assetKey/path/hash、段階/左右画像、bodyFocus/layers等、代替テキスト、表示位置/サイズ、描写と手順の対応 | 既存image/stages/visual参照。画像欠落0、ミラー表示が案内側と一致、390pxでタイマー/CTA/navを隠さない。存在検査だけで構図やレイアウトPASSにしない |
| REG-09 | 一般注意、実践前条件、支援/軽減手順、中止時の案内、安全レビュー根拠/担当/日/範囲 | `generalCautions`/breath safetyを参照。瞑想等に構造化安全情報がない場合はmissingとして記録。Current-turn Safety/planGateは外側に維持。blockedなら開始/音声/時計/保存0。登録validatorは安全ゲートの代替ではない |
| REG-10 | Knowledge entry/master ID、図鑑slug/URL、出典タイトル/著者/版/箇所/URL、出典が裏付ける主張、照合者/日/状態 | 既存Knowledge参照保持。catalog `verified` と独立出典照合を分離。DB実在は未照会なら未確認。出典なしはnull＋不足理由、ID/効能/医学的根拠を捏造しない |
| REG-11 | contentの既存status、移行状態、レビュー状態、未確認/失敗一覧、承認履歴、rollback | statusのactiveと検品PASSは別軸。採用main、公開commit、公開asset hashを分離。mergeとPublish/Edge/DB操作は別承認 |
| REG-12 | 検品項目ごとの入力/期待/実測/結果/環境/証拠/確認者/日時 | PASS/FAIL/unconfirmed/not_applicableを項目単位で記録。source/mock/SSR/実ファイル/実機/ユーザー報告の証拠種別を明示 |

現行 `PracticeDefinition` はREG-01、時間方式、cue配列、Knowledge参照と未確認状態を実装。残りはcontent参照と登録票で補完する設計であり、共通フィールドへの実装やvalidator完備を主張しない。必要な型/レジストリ追加は対象1件の独立PRで行う。

## 時間方式は実践ごとに保持する

| 方式 | 既存対象 / 実行上の境界 |
| --- | --- |
| narration_then_silence | 腹式: 音声ended後に吸気4秒/呼気6秒×6周。案内は保持に含めず、完了音声末尾まで待つ |
| narration_then_hold | 立ち木: 1分指定→右30秒/左30秒。intro/setup/読み/切替のended後に各保持。実時間は案内分を含む。数字を案内文章だけに戻さない |
| phase_minimum_and_voice_end | Box等: フェーズ最小時間と音声末尾の双方を待つ。腹式の「音声終了後に秒数を追加」と同じ意味に書き換えない |
| wall_clock_with_voice_drain | 山/猫牛: AsanaClockRuntimeのwall clock＋既存必須/任意voice queue。未再生の必須音声/末尾を打切って完了しない |
| media_narration_then_silence | 数息観専用Session: `/voice/susokukan-intro-full-v2.wav`、60秒audio.currentTime時計/字幕→ended→240秒performance時計の静寂。初期5:00。buffer/pause/error/stop/restartと古いcallback抑止を維持。古いcatalog230秒＋終盤音声timelineを入力にしない |
| legacy sequence/display clock | その他の現行瞑想や一般アーサナの実経路は、上記ラベルだけで意味を確定しない。現行builder/runtime/画面/phaseを追跡し、実測してから専用adapterを設計する。既存PracticeTimingに未対応の方式をcastして押し込まない |
| sequence step holds | 別枠太陽礼拝12段階、左右、3tempo、既存voice ended＋step保持を保持。3catalog24件に含めず、個別移行 |

数息観を汎用wall clockに統合しない。各方式でpauseは実経路に応じて時計/音声を止め、stop/離脱/restart後の古いcallbackを無効化する。途中中止/未開始保存0、完了一度というDATA-01の境界も保持する。

## 1件の登録票テンプレート

以下は文書テンプレートで、実行用JSON schemaや音声生成指示ではない。catalogの値を参照し、出典/難易度不足を実調査で埋める。

```yaml
registrationVersion: 1
practiceId: <既存または新規の一意ID>
kind: <asana | breath | meditation>
contentRevision: <改訂ID>
source: { catalogPath: <path>, baselineCommit: <sha>, verificationHead: <sha> }
name: { catalogReference: <path/ID>, pronunciation: unknown }
difficulty: { catalogReference: <path/ID>, level: unknown, evidence: unknown }
guide: { builderReference: <path>, transcriptReference: <path/revision>, cueIds: <一覧> }
assets: <key/path/hash/形式/長さ/生成原稿と手順の参照一覧>
timing: { mode: <実経路の方式>, runtime: <path>, clockOwner: <時計>, planned: <実経路参照>, display: <現行数値仕様> }
bilateral: { applicable: <yes/no>, orderAndHoldReference: <参照または理由> }
visual: { catalogReference: <path/ID>, stageSideMapping: <対応表> }
safety: { catalogReference: <path/ID>, missing: <不足一覧>, independentReview: unconfirmed }
knowledge: { catalogReference: <path/ID>, sources: <タイトル/版/箇所/主張>, independentVerification: unconfirmed }
acceptance: <下記項目単位の検品票>
release: { existingStatus: <現状>, migrationStatus: planned, approvedScope: <承認範囲>, rollback: <独立revert> }
```

検品レコード形式: `{ itemId, practiceId, contentRevision, sourceCommit, assetHashes, expected, observed, result, evidenceKind, evidencePath, environment, reviewer, checkedAt, limitations }`。環境は端末/OS/ブラウザ/画面幅/音声設定を含む。not_applicableには理由を付ける。新head/新音声hashの検品へ過去PASSを自動引継ぎしない。変更していない資産の証拠再利用は同一hash/条件/対象範囲の照合理由を記録する。

## 公開前検品と登録手順

| Gate | 必須確認 / 証拠 |
| --- | --- |
| G1 基準固定 | 最新mainと対象ID/経路、AGENTS/仕様/バックログ、改訂・cue・source/asset hash、変更前出力を記録。ID重複/alias/ファイル欠落を検査 |
| G2 内容レビュー | 名称/難易度/原稿/Visual/一般注意/Knowledge出典を照合。不足は明記。新規内容は手順・安全の担当レビューを経て登録し、未根拠の効能を追加しない |
| G3 自動回帰 | npm ci→typecheck→test:regression→build、GitHub Actions audio/edge-safety。対象のcue/表示/音声キー/Visual/Knowledge/安全metadata等価、全24出力/211asset/専用時計保護。新規追加時は正当な差分を別承認し、旧fixture期待値変更だけで隠さない |
| G4 時間・停止 | production runtimeで音声遅延/ended/末尾/重複/字幕/保持/左右/切替/pause/stop/restart/完了一度を検査。模擬transportは音の発音を証明しない。Safety/未開始/中止保存0は実画面/保存経路で別検品 |
| G5 実機 | Galaxy Androidで全行程実聴/録画、発音「はきます」、末尾、完全同期、予定数値→残秒、左右、Visual、390px CTA/nav。LINE入口を対象にする場合はLINE内蔵ブラウザでも確認。クラウド保存は許可環境で別確認 |
| G6 採用/公開 | diff・全テスト・実機未確認・独立rollbackをPRへ記録。実機未確認なら「コード採用」と「公開品質完了」を区別。公開は別承認で対象source/hash/main一致と公開後実測を確認。今回はPublish/Edge/DB工程を実行しない |

各GateをPASSにするには対象範囲の証拠が必要。fail/unconfirmedの公開可否をCIの緑だけで決めない。既存公開版の数息観ユーザー報告PASSは、共通化後の腹式/立ち木やLINE全端末へ拡張しない。

## 次の移行候補と独立改善

次の第一候補は `box-breathing` 一件。腹式の案内後保持と異なる「フェーズ最小時間＋音声ended」の契約を、4フェーズ/周回/Visual/pause/終了条件の変更前後traceで検証できる。今回は実装しない。
後続候補はアーサナ `balasana`、瞑想 `mindfulness-1min`。それぞれ旧実経路と画面時計の棚卸しを先に行い、1件ずつ新ブランチ・比較・テスト・PRへ。数息観専用adapterは最後に個別検証。候補順は移行承認を意味せず、24件一括変換は行わない。
立ち木の「ガイドをより丁寧に」「左右時間を改善」はFB-13/FB-14の独立改善。今回の読取契約で解決済みとせず、原稿/音声・時間変更は仕様合意とbefore/after検品を伴う別PRとする。現在の左右均等・案内後保持・数値表示を保護条件として残す。
