# 必須回帰テスト

## 実行ゲート
`npm ci`、`npm run typecheck`、`npm run test:regression`、`npm run build`。
Edge起動/Safety: `deno test --node-modules-dir=none --allow-env --allow-read tests/ai-teacher-release.test.ts`。認証/プロフィールはstub、OpenAI/DB呼出は拒否。Secret不要。本番DBに接続しない。
PR CIは上記を実行する。ブランチ保護/required checksのGitHub設定は未変更で、CIの存在だけでmerge防止が保証される訳ではない。人の受入チェックを併用する。

| ID | 自動回帰（実製品ソース使用） | 手動/統合受入（必要時） |
| --- | --- | --- |
| AUD-01 | treeの字幕/読みmanifest一致、両側kana、WAV存在、生成手順は同じmanifest | Android Chrome/LINEで最後まで試聴。「つきます」でない。端末/ブラウザ/音声キー/hash/試聴者/結果記録 |
| TIME-01/02 | TreeHoldTimerの予定/残秒、実runtimeで案内後保持、左右30秒、pause保持凍結 | 左右全行程録画。案内時間、右保持、切替、左保持を分離。数字あり、重なりなし |
| AUD-02 | 長い音声を予定時刻で切らない、完了音声もendedまで待つ。停止後遅延callbackで進行しない。字幕は前音声中に先走らない | 休息末尾/次アナウンス重複なし、声と字幕とVisual同期。実ファイル/実機はmockの代替不可 |
| DEMO-01 | 現行3ポーズID/順/1分、assetとclock timeline、Box 4フェーズ契約 | event-demo未ログイン、CTA→お手本（未開始）→実践→完了、LINE/Web登録が分離。CTA/タイマー/UI総合は未自動化 |
| PRO-01/02 | 確定資格のみ判定、未取得/受講中でfalse | 学びリンクと遷移、320/390pxの見出し/本文/CTA/横overflow、公開文言 |
| DIAG-01 | directory既存40件正常/DEMO/旧診断snapshot非破壊 | 診断完了で主CTA1件、次の行動が明瞭、通常版DEMO推薦0 |
| SAFE-01 | 20Safety分類＋本番/preview実entrypoint起動2テスト。Safetyでprovider/usage呼出0 | 実LLM会話・YK0263/0267 context・日本語一貫性。分類PASS≠実回答PASS |
| CAM-01 | 16模擬camera lifecycle/errors/late permission/stream release | Android/LINE権限/実映像/停止/再起動。今回camera変更なし |
| DATA-01 | mainには永続化の統合suite未反映（Draft #10） | 同一Google/LINEユーザー再ログインで先生/Memory維持、読込失敗上書きなし、別ユーザー漏えいなし |
| CHAT-01 | Draft #10のfocus/pending/回答スクロール統合をmain導入時に移植 | STEP5で入力位置・送信待ち・最新回答がスマホで見える |
| TEACHER-01 | Draft #10本人下書きRLS/編集suiteはmain未導入 | 本人read/edit、他人不可。公開掲載所有権未確定なら付与しない |
| LOG-01 | クラウド保存統合は別受入が必要 | 完了保存+1、連打/reload同session1件、未開始/中止0。既存記録削除なし |

## 既存テストの監査結果
以前のCIはtree/audio4件＋buildだけ。camera/directory/Edgeテストは存在したがCI未接続だった。本PRで主要suiteを接続し、追加契約/lifecycle回帰を入れる。
`src/lib/__tests__/practiceAudioRuntime.regression.ts` はブラウザ補助でCI単独runnerではない。
`scripts/test-breathwork.mjs` は現行腹式呼吸字幕と異なる旧期待値でFAIL（2026-10-10実測）。`scripts/test-susokukan.mjs` は消失した `src/lib/susokukanSession.ts` 参照でFAIL。両方をPASSとは扱わず、legacyとして残す。新suiteは現行builder/phasesの意味契約を検証するが、旧suiteの全範囲を代替したと主張しない。移植はBACKLOG Q-02/Q-03。

## 結果記録
各確認に基準commit、環境、入力/操作、期待/実測、PASS/FAIL/未確認、証拠、制約を付ける。テストの緑だけで「完成」としない。修正は失敗ケースを残して同一suite再実行。公開承認後は公開asset hashと表示を検証し、重大障害時rollback。今回merge/Publishしない。
