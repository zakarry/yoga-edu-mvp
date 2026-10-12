# 新規アーサナ1件の追加試験計画

2026-10-13、基準main `93eef8446e635b821ed537836f8b4129c5bd907e`。[登録仕様REG-01〜12/G1〜6](PRACTICE_CONTENT_REGISTRATION_V1.md)とAGENTS/PRODUCT_REQUIREMENTS/REGRESSION_TESTSに従う。今回は計画のみ、catalog/画像/音声/DBへの追加なし。

候補は座位の杖のポーズ（ダンダーサナ、候補ID `dandasana`）。現行poseCatalogの12 IDと重複しないことをソース照合。既存のbalasanaは新規でないため候補にしない。難易度・安全・手順は指導者と出典レビュー待ちであり、初心者に安全と未確認のまま断定しない。新ID全catalog/alias重複検査は実装開始時に再実行する。

| 登録項目 | 計画と検品条件 |
| --- | --- |
| 名称/読み/難易度 REG-01〜03 | 日本語・サンスクリット・英語・aliases、難易度/強度/補助具/軽減の根拠を担当レビュー。名称読みは「だんだーさな」の候補を実聴。未確定はunknown |
| 原稿/字幕 REG-04〜05 | 準備→姿勢→保持→解放の段階を内容レビューで確定。displayTextとspeechTextを分離し「吐きます」は「はきます」。cueId/audioKeyに新revision、既存asset/keyを上書きしない |
| 時計/左右 REG-06〜07 | 候補はnarration_then_hold。30秒保持案は未確定。案内ended後に開始、案内は予定数値、保持は残秒。左右はnot_applicable（正面対称の座位を対象）、左右動作を追加する場合は別仕様。既存schedulerが適合するかadapter/runtime traceで検証してから採用 |
| Visual REG-08 | 新しい正面/側面説明の必要性、姿勢とcue対応、alt、著作利用権、asset hash/寸法。添付既存画像を別ポーズとして流用しない。320/390/430pxでnav/CTA/画像を検品 |
| Safety REG-09 | 手順・補助・軽減・中止のレビュー担当/根拠を記録。医学的処方/効能を追加しない。安全blockedで開始/音声/時計/保存0を実経路検査 |
| Knowledge REG-10 | 指導資料のタイトル/著者/版/該当箇所/主張を一件ずつ照合。現時点出典未選定・ID未発行。DB実在/verifiedを捏造しない |
| 状態/証拠 REG-11〜12 | draft→content-reviewed→device-verified→approvedの証拠を別管理。追加branchのみ、一般Plan/DEMOへ自動掲載しない。未確認ありなら公開保留 |

## 実装PRで実行するゲート

G1: 最新main・24出力/211素材・保護ソースhashを固定、新規1件を既存と別fixtureへ。既存fixtureの期待値を新規件数へ置換して非破壊を隠さない。

G2: 内容/安全/出典/利用権レビュー後のみ新catalog+読取契約adapter+cue+Visual+音声参照を作る。既存24件や汎用schedulerを一括変更しない。

G3/G4: npm ci/typecheck/test:regression/build、既存17ブラウザ件を全実行＋新規1件の登録拒否/実経路完走/時計/遅延音声/字幕/Visual/pause/resume/stop/restart/古いcallback/保存一度を必要に応じ追加。音声重複0、末尾待ち、未開始/中止保存0。CI audio/edge-safety/browser-practiceを必須確認。数息観専用時計と既存左右30/30を保護。

G5: Galaxy Chrome/LINEで原稿発音・末尾・全同期・safe-area・キーボード・重要操作・軽減/中止を人が検品。source/hash/端末/OS/ブラウザ/日時/確認者/動画とPASS/FAIL/未確認を記録。自動mediaイベントを可聴品質PASSにしない。

G6: 独立PRでdiff/レビュー/全テスト/未確認を報告。コード採用・staging配置・main merge・本番公開は各別判断。rollbackは追加1件の独立revert。新規Function/DB登録は今回も次の内容実装でも自動的に含めない。

開始前の残件: 内容レビュアー/出典・保持秒/軽減方法・Visual/音声制作方法・許諾・公開対象範囲。これらを確定するまで新規実践を本番へ登録しない。
