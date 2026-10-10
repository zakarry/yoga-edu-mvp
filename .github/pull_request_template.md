## 問題と変更後の挙動

## 作業開始の確認
- 基準main commit / 検証head:
- [ ] AGENTS.md、PRODUCT_REQUIREMENTS、REGRESSION_TESTS、USER_FEEDBACK_BACKLOGを読んだ
- 影響する仕様ID / Feedback ID:
- 原因と再現証拠:

## 検証（実測）
- [ ] Typecheck / Build / test:regression
- [ ] Edge関連時、実entrypoint起動＋Safetyテスト
- 実行環境 / 件数 / 証拠:
- 実機・実LLM・OAuth・DB受入の結果（mockと区別）:
- 未確認 / FAIL / 理由:
- [ ] 音声変更時、生成原稿・asset hash・「はきます」・末尾/重複を人が実機試聴
- [ ] timer変更時、予定数値・保持残秒・左右均等・切替・pause・字幕同期
- [ ] UI変更時390px、重要CTA/横overflow/bottom nav、DEMO/Pro Yoga

## 変更範囲・公開
- [ ] 無関係なAI先生/Auth/LINE/MFA/Admin/DB/RLS/会員/DEMO/camera/カルテ変更なし
- 変更ファイル / 新migration（あれば明示）:
- 既存挙動への影響 / rollback手段:
- merge・Publish・対象Edge deployの承認状態（今回未実施）:
- 公開時は送信source/hash、main同期、公開実測を別途記録
