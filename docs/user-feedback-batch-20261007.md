# User Feedback Batch #1 — 2026-10-07

このバッチは、イベントで得た利用者の声を製品改善と回帰テストへ戻す最初の開発サイクルです。公式LINE登録者39名全員への調査ではありません。会話を記憶している一部参加者の定性的フィードバックとして扱います。

基準はGitHub main `55ed1cd8744f7fefc6b33887387c9058c118c8ac`。本番Publish、Edge deploy、本番DBへのmigration適用はこのバッチに含めません。

## 利用者の声と製品仮説

正式フィードバック台帳：

| 声 | 今回の扱い |
| --- | --- |
| 「これが無料なんですか？！」「知り合いにも教えたい」「こういうの欲しかった」 | 無料入口・紹介意向の示唆。利用継続率や市場規模の証拠にはしない |
| 「試験前にヨガ図鑑欲しかった」「アーサナの種類はこれから増えますか？」 | 3領域のContent Expansionバックログ |
| 「先生も登録したい人、沢山いると思います」「プロヨガの先生が目立つように」 | 本人編集・資格表示監査 |
| 「素晴らしい先生のご紹介をありがとうございました」 | AI先生の関係継続性の仮説。回答品質の全件PASSとは扱わない |
| 「時間がある時に、もっといじってみます」「瞑想とか、ガイダンスに従えばいいのは便利」 | 短時間入口・呼吸瞑想を正式バックログへ |
| 「どこからスタートしていいのか迷う」「クリックできるのか分かりにくい」「スクロールに気付かない」 | Home監査、CTA・スクロール案内。初見ユーザー再観察が必要 |
| 先生名が消えた／休息音声が途中切れ／対話回答に気付かない | 永続化・音声割り込み・自動スクロールの回帰テスト |
| 立ち木の反対側が短い／前屈の手が不自然／「先生登録した後、修正はできますか？」 | 左右時間・前屈画像・本人編集権限の回帰対象 |

「スタジオ体験のハードルが高いので、まずこれでやってみる」は、自宅で少し体験してから先生・スクール・オンライン・イベントへ進む入口に価値があるという仮説Aを支えます。「朝10分だけでも」は時間起点のYogaという仮説Bにつながります。

呼吸法への相談に良い反応があり、瞑想のガイダンスも便利という声がありました。呼吸・瞑想をアーサナの補助に限定しない仮説Cです。「試験前に図鑑が欲しかった」「先生も登録したい」は経験者・指導者にも価値がある仮説Dにつながります。

名前をつけた先生が消えた体験と「素晴らしい先生のご紹介」の反応は、AI先生を「自分の先生」と認識する可能性を示す仮説Eです。先生名、性格、指導言語、許可されたMemory、実践の継続性が重要です。いずれも確定した市場事実ではありません。

ブランド「自分に合うヨガは、続く！ Yoga AI」を維持し、始める→実践する→続ける→学ぶ→先生とつながる→教えるまでを支えるプラットフォームという方向性を検証します。

## 製品原則

1. 機能を探させず、次の行動を示す。
2. 同一ユーザーの先生と許可された設定・Memoryを継続させる。
3. 未経験者、再開者、経験者、指導者へ段階的に価値を提供する。
4. アーサナだけでなく、呼吸、瞑想、Knowledge、哲学、実践を含む。
5. ユーザーの時間にYogaを合わせる。
6. 違和感を単発修正で消費せず、回帰テストへ変換する。

## P0 AI先生の永続化

現行mainの `loadPersona` / `savePersona` は `yogaTeacher` というlocalStorageだけを参照します。AI先生名、アバター、性格、得意分野、画面言語、指導言語、作成日はC「ブラウザ内だけ」に該当します。DB削除が起きた証拠はなく、実際のお客様の認証provider・ユーザーID・端末保存状況は未取得なので、A/B/D/Eをお客様の事例について断定しません。

新規 `ai_teacher_personas` に同じ `auth.users.id` ごとの設定を保存します。読み込み失敗を「設定なし」として上書きしません。保存・削除エラーを表示し、ログインアカウントが変わった後の古い応答はUIへ適用しません。会話の先生設定にも復元した同じpersonaを渡します。Conversation Engineの回答ロジック、Safety、Intent、Repair、Knowledge、言語判定、promptは変更しません。

旧ブラウザ設定を別アカウントへ自動割当しません。「以前の先生設定を入力欄へ読み込む」から本人が内容を確認し保存できます。消失済みのlocalStorageを復元できるとは主張しません。未ログインは従来どおり端末内保存です。

Memoryは既存のuser_id付きクラウドサービス、過去実践は既存practice_logsから読みます。削除・移行しません。成長設定 `growth.prefs` と一部ユーザー設定は今もブラウザ内保存であり、アカウントを跨ぐ成長設定の移行は別バックログです。認証providerが異なる別アカウントを勝手に統合しません。

検証は実コンポーネントのアカウント切替テストと、ローカルPostgreSQLでの保存・再読込・RLSです。実Google/LINEログアウト再ログイン、本番DBでの保存は未実施です。

## P0 休息ポーズの音声

mainの音声runtimeでは、通常音声が未完了でも残り時間のscheduled cueが発火し、再生エンジンのstopによって割り込みます。未キャッシュ音声の推定watchdogも再生中に停止し得ます。同じテストをmainのソースへ当てるとFAIL、修正後はPASSです。

再生中・通常キュー進行中は割り込まず、ended後に次へ進みます。完了時点を過ぎた残り時間案内はスキップし、完了案内も最後まで再生してから終了します。固定秒数を実践タイマーへ足して回避する修正ではありません。実スマホで聞き取りまで行った受入は別途必要です。

ローカルブラウザでも実製品AudioFileEngine、既存MP3、実runtimeを使って1分の休息を再生。各文のcueEnd後に次文が開始し、完了案内と次ポーズ案内の終了後にcompletedになり、エラーなしでした。これは実ファイルの再生イベント確認であり、Androidで人が全音声を聞き取った受入ではありません。再実行用は `tests/browser-feedback.html`（本番ビルドに含めないテストfixture）です。

実再生は65.8秒で完了。立ち木も実ファイルで146.2秒で完了し、右39.8→69.8秒、左111.4→141.4秒で保持は各30.0秒でした。音声・字幕・cueイベントは `docs/user-feedback-audio-evidence-20261007.json` に保存しました。

## P1 対話と診断後の導線

「話しかける」はSTEP5へスクロールし入力欄にfocus。送信中は「考えています…」、回答後は最新位置へスクロールします。自動UIテストでは回答を保留できるテスト用サービスを使い、実製品コンポーネントの処理中状態とスクロールを検証します。実LLMの回答品質を検証したという意味ではありません。

診断結果の主CTAを「AI先生と今日のYogaを作る →」に一本化しました。未掲載のおすすめでも主CTAがdisabledになって次の一手を失わないようにしています。カルテは補助CTAです。390pxで入力focusと回答可視位置、横はみ出しなしを実測しました。

## P1 立ち木のポーズ

従来は同じ全体時計の途中で左側へ切り替え、右側説明の長さによって左側の実保持時間が短くなり得ました。新方式は準備音声→右保持→切替と準備音声→左保持→完了です。1分設定では左右各30秒、切替音声は保持時間を削りません。保持時間以外に準備・切替ガイドがあることを表示し、記録には実際の経過時間を使います。

壁・椅子の支持、膝へ足を押し当てない、つま先を床に残してよい、ふらついたら足を下ろす、無理に呼吸しない案内を含めました。字幕と同じ文から日本語の録音素材8本をローカル生成し、TTS非対応端末でも再生できるWAVを同梱しています。

音声素材の合計を実測すると、左右各30秒を含む約145.9秒です。「一律30秒延長」ではなく、案内完了と等しい保持を優先した結果です。短時間化・話速の実機評価は残件です。左右保持30秒、準備・切替終了待ち、途中で完了しないことは自動テストPASS。スマホ音声ON/OFF・中断/再開の全組合せは未受入です。

## P2 前屈と講師登録

前屈は現行mainのstage3画像で片手が脚をつかむ形を確認しました。両腕を自然に下ろし、頭・足先を含む新画像に差し替え、対応する説明も合わせました。他のポーズ画像は変更しません。画像は生成後に目視確認済みです。

390pxの実製品STEP6にも新画像が読み込まれ、main画像幅約308px、頭・足先の欠けなし、横overflowなしを確認。証跡は `evidence/fold-390.jpg`（作業成果物）です。

講師登録はmainではReact stateへのダミー追加だけで、再ログイン後の本人確認・編集がありません。既存Directoryテーブルは公開SELECT主体で所有者情報を持たず、既存の掲載者を推測でユーザーへ割当できません。

最小実装は `teacher_registration_drafts` で本人の登録下書きを保存・再編集する画面です。新しい権限はこのテーブルだけ。写真はURL入力です。既存掲載データへの直接編集・自動公開・Admin CMSは追加しません。公開掲載と既存講師の所有権確認は次Phaseとして必要です。本人の再編集と他人のSELECT/INSERT/UPDATE拒否はPostgreSQL RLSテストPASSです。

## 監査と正式バックログ

初見Homeには既に「今日は何をしたいですか？」、ルーティーン、利用者別入口など複数の入口があり、重複による選択負荷があります。今回は主CTAに矢印と最初の行動・スクロール案内だけを追加。全面改修はしません。次Phaseは4入口を1か所へ集約し、390pxで初見の次行動到達時間・誤クリック・スクロール認知を比較します。現時点で初見者の3秒理解を実証したとはしません。

Professional YogaカードはGold badgeを持ちますが、旧判定 `includes('取得')` は「未取得」「取得予定」も誤表示します。取得済みの既知ステータスだけを判定し、先生は「Professional Yoga取得」と表示。推薦順位は変更しません。資格の外部照合・有効期限・失効状態を表す設計は別Phaseです。

コード内実践カタログはASANA 12件（active 11）、BREATH 7件（active 6）、MEDITATION 5件（active 5）。これは実践カタログ件数であり、本番Knowledge DBの総件数ではありません。本番Knowledge件数は未照会です。次Content Expansionでは図鑑記事、実践ガイド、音声、画像、出典、初級適性、安全レビューを別々に棚卸しし、呼吸・瞑想も同等の優先領域にします。大量コンテンツ追加は行いません。

正式バックログは、Home4入口、3/5/10/20分の時間起点Yoga、ASANA/BREATH/MEDITATIONの3軸、Personalized Home、指導者向けProfessional導線、Knowledge Expansion、成長設定のクラウド保存、講師の公開掲載編集です。個人化Homeは未経験・短時間・呼吸瞑想・経験者・先生ごとの入口を仮説として扱い、診断・利用履歴・許可されたMemoryを利用する前に同意と説明を設計します。

## 受入と本番反映条件

`npm run test:user-feedback` は、音声割り込み、左右保持、PostgreSQLの本人限定保存・編集、資格バッジ、実コンポーネントの先生復元・focus・pending・回答スクロール・診断CTAを検証します。本番OAuth、実機での聴取、既存掲載の公開編集はこの結果に含めません。

新規migrationは2本です。既存テーブル・既存RLS・会員データの変更はありません。適用前にフロントだけ公開するとクラウド設定/講師下書きが使えません。検証DBでmigration→本人ログインE2E→受入→公開の順が必要です。rollback時も新規テーブルのデータは削除しません。

main merge、Bolt Publish、production/preview Edge deploy、本番migrationは未実施です。

## 検証結果と受入残件

| 対象 | 結果 | 証拠・制約 |
| --- | --- | --- |
| TypeScript / Build | PASS | `npm run build`。既存のchunkサイズ・Supabase import警告あり |
| Feedback regression | PASS | 5テスト。本人保存/RLS、アカウント切替、音声割込、左右保持/一時停止、対話/診断CTA、資格誤表示 |
| 既存Safety / Edge起動回帰 | PASS | 22テスト。実LLM・本番deployではない |
| Home / 対話 / 診断後CTA / 前屈390px | PASS（ローカル） | DOM寸法・スクリーンショット。初見者の理解速度は未測定 |
| AI先生の実OAuth再ログイン | 未確認 | 検証DB migration適用後にGoogle/LINEで必要 |
| 音声のAndroid実機聴取 | 未確認 | PCで実音声イベント確認済み。人による聴取は未実施 |
| 立ち木短時間の適切さ | PARTIAL | 左右保持は同じ。詳細ガイド込み約146秒の長さは再評価が必要 |
| 既存公開講師の直接編集 | 未実装 | 所有権を推測で付与しない。今回の保存・編集対象は本人の登録下書き |

Conversation Engine / Safety / Intent / Knowledge / Repair / prompt、Auth、LINE、MFA、Admin、Camera、DEMO分離、既存会員/DB/RLSの製品ソースは変更なし。personaを読み込むstorage adapterのみ変更。新規2テーブルのmigrationはレビュー用ソースだけで、本番未適用です。

## 検証環境の追加確認（2026-10-07）

Boltへ実際にアクセスし、Yoga AIプロジェクトのGitHub状態がmain Activeで、Feedback作業ブランチが一覧にあることを確認しました。Previewは「No preview available」です。Duplicate画面は「Database will be cloned」「Custom domain won't be transferred」「GitHub will be disconnected」と表示し、DBを複製せず進む選択肢はありませんでした。Duplicateは実行せずCancelしました。本番会員データ・設定は変更していません。

この端末ではDocker/Supabase CLIが見つからず、このリポジトリにもpreview用GitHub Actionsはありません。現時点で実Google/LINE認証を持つ独立検証環境とスマホ用URLは用意できていません。ローカルの模擬ログインを実OAuthのPASSに置き換えません。

未適用migrationやDB障害で先生設定の読み込みが失敗したとき、保存と対話を無効にし、既存先生を上書きしない回帰条件も追加しました。migrationが未適用のままフロントだけPublishすることは受入未完了です。

## 2026-10-08 additional registration regression

The actual registration component test found stale input after switching accounts. Rendering now waits for the selected owner’s load result. Rejected read/save promises show retry guidance; failed saves retain input and release the busy state. Controlled transport UI tests cover restore, edit, failed save/retry, owner switching, failed read/retry. Regression suite: 6/6 PASS. This is local integration evidence, not a production OAuth or smartphone cloud test. No merge, Publish, production Edge or database migration was performed.
