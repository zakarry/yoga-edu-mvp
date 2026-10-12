# User Feedback Batch #1 最新main再監査

2026-10-13、基準 `93eef8446e635b821ed537836f8b4129c5bd907e`。ソース監査であり実OAuth/利用者テストではない。過去のバックログは履歴として保存。設計: [staging](STAGING_INTEGRATION_DESIGN.md)。

| 優先/ID | 最新mainで実装済み | 未実装・未確認 / 次の受入 |
| --- | --- | --- |
| P0 FB-01/Q-04 | aiTeacherStorage.ts のyogaTeacher localStorage保存・読込、MyAITeacherPage初期復元 | userId別キー/DB永続化なし。save失敗はignore、JSON形状検証なし。同ブラウザ再読込とOAuth再login維持は別。PR #10案のDB/RLS依存・最新mainとの差分を別レビュー。A再login、別端末、B隔離、読込失敗上書き0が必要 |
| P1 FB-03 | chatTyping送信抑止/待機表示、先生名表示、既存対話 | 最新回答へのscroll/focus改善は未導入（現行scrollIntoViewは実践・ガイド等）。入力/回答可視性・キーボードは実機未確認。独立UI PRで再現→最小修正→browser検品 |
| P1 FB-04 | PR #11の診断主CTA、DEMO分離 | 初見が次の行動を理解できるか未実測。診断完了→推奨1件→開始→完了を匿名/検証account別に確認 |
| P1 FB-10 | 現行Home/AI先生の入口 | Home4入口・時間起点・Personalized Homeは未実装。5人程度の初見タスク観察で迷い箇所/到達時間/誤操作を記録、数値目標は合意後。全面改修しない |
| P1 FB-05/13/14 | PR #12/#13/#21、左右各30秒、案内ended後保持、予定数字。PR #24共通音声修復 | 「より丁寧」「左右時間改善」は独立未実装。希望する説明不足/保持秒/切替余裕が未特定。現30/30を変更せずレビュー原稿案を作る工程。実機末尾/左右/同期未確認 |
| P2 FB-09 | App.tsx先生登録→state一覧へ追加、RegisterForm入力 | 本人の永続下書きread/edit・公開プロフィール編集・所有権は未導入。画面内ダミー追加をDB登録済みと扱わない。本人許可/他人拒否/保存失敗復元を隔離環境で検品 |
| P2 FB-11 | PR #14のPro Yoga左寄せ下線/スマホ表示/公開文言、確定資格判定 | 実資格/失効照合、Galaxy/LINE再受入未確認。Professional表示改修を新規資格権限付与と混同しない |
| P2 図鑑拡張 | 既存catalog/Knowledge resolver/serviceと登録仕様 | 新項目の出典独立照合・安全レビュー・著作利用権・DB登録は未実施。1件ずつ、医療効能を推定しない |

Q-02/Q-03はPR #17で修復済み。Box読取契約PR #23、Q-05修復PR #24、モバイル/17ブラウザ回帰PR #25はmain採用済み。Box固有pause/resume元操作経路は未確定、現行Boxに一時停止ボタンなし。共有runtimeテストと立ち木pause/resumeをその実機PASSに転用しない。

PR #17公開版数息観の完走・同期・「はきます」はユーザー報告PASSの既存記録を維持。新main/新音声/LINEへ引き継がない。既存24定義・211素材、数息観60秒media→ended→240秒静寂を変更しない。

## 対応順と修正判断

GitHub実照会でPR #10はopen/Draft/未merge、head `a88a66806159652b5668cac1067251dfc0b83683`。persona service、teacher draft UI、2本のmigrationとともに旧tree-v2音声/runtime/画像差分も含む。一括採用せず、現在のtree-v3/Q-05/共通契約を保護し、P0と本人編集の必要差分だけを再設計する。

最初はP0のアカウント隔離と保存/読込エラー保護の設計・Draft #10再レビュー。実OAuth受入には独立stagingが先決。ここでglobal localStorageを無断で新keyへ移すと既存設定を消失させ得るため、単発key置換を修正として混ぜない。移行仕様/DB採用/所有者RLSを決定した独立PRにする。

続いて対話focus/scrollと初見導線を独立UI PR、立ち木はFB-13/14の仕様を確定後に独立音声/時間PR、最後に本人登録編集・図鑑1件。今回必要な修正は古い進捗記録の補正と設計・検品条件の明文化。製品コードを変更せず、未実測をPASSにしない。
