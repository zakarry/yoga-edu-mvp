# Q-05 共通音声制御修復（2026-10-12）

基準main: `b7448f0fcddf3d103b279c9efd2ae61d4ddab27c`。Box共通データ契約PR #23とは別ブランチ・別PR。今回merge/公開/DB変更は行わない。

## 根本原因と修復

1. PracticeAudioRuntimeの通常フェーズは「phaseDurationSecの経過 AND 音声ended」で次へ進むが、resumeで作り直すtimeoutが音声終了を待たず直接advanceしていた。長いガイドを途中停止・再開すると次の音声要求が先に発行される。既存エンジンは直前音源をstopするため、実経路では途中切れ・再開競合も生じうる。模擬transportでは未終了中の新要求を重複として検出。
2. 停止中のendedは捨てられ、終了済みでも次へ進まない場合があった。音声終了と時間終了の状態を維持し、resumeも同じ待ち合わせを使う。
3. AudioContext.resumeのPromiseがstop後に旧speakByKeyを再発行できた。fetch/decodeは停止番号を検査していたがpauseは検査しなかった。現在要求・停止番号・停止中状態を共有し、読込中もisPlayingに含める。contextのsuspend完了を待ってからresumeし、遅れた再開・読込結果を無効化する。
4. old endedとfinalの400ms遅延はcueIndexだけでは新sessionと区別できなかった。session/キュー世代、再生source/要求番号、終了時callbackの固定と一回限り処理で遮断。stopで終了handlerを外す。MyAITeacherPageのunmountでも両runtimeとエンジンを停止する。

共有エンジンは既存singletonを維持し、新要求前に旧WebAudio/HTML/TTSを停止する。音声ファイル、音声キー/読み原稿、字幕、表示、Visual、Safety、Knowledge、呼吸時間・回数、左右保持時間、数息観Sessionと専用media時計は変更しない。最終音声後400msも維持しpause中は凍結する。

## 再現と回帰の証拠

変更前mainで最初のruntime7テストを実行: 5 PASS / 2 FAIL（長音声の再開、時間終了後の停止中ended）。変更前の実音声エンジンを同じ非同期テストへ差し替えて実行: FAIL（stop済み要求がcontext.resume後にdecodeを開始）。音源実聴ではなく、実コードと制御可能な時計/transport/AudioContextを使った自動再現。

追加テスト: `tests/q05-audio-control.test.ts` 9件、`tests/voice-guide-lifecycle.test.ts` 1件。通常/長音声/停止/再開/反復/停止中ended/next/停止中next/画面離脱相当dispose/再開始/旧callback/最終400ms/二重終了、非同期resume/decodeキャンセルと最大同時source数1を確認。通常Boxは4秒×4フェーズ×4周を維持。腹式/立ち木の既存before-after trace、左右保持、数息観60秒media→ended→240秒静寂は全回帰で保護。

元の`practice-core-before-05666f4.json`は保持。意図した3ソースだけ`q05-approved-source-hashes.json`に明示的な修復後hashを置く。24出力と211assetの元hash比較は変更しない。sourcehash単独で動作等価性を主張せず、修復箇所は追加制御テストで検証する。

型チェック・Build・全回帰はPR作成前に実行。GitHub Actionsのaudio/edge-safetyはpush後の当該headで確認し、結果はPRに記録する。edge-safetyはテストでありdeployではない。

## 実機検品とPR #23の関係

Q-05はコード修復・自動回帰PASSとGalaxy実機PASSを区別する。修正後Boxの長い音声でpause/resume/連打/next/離脱、末尾、発音、字幕/タイマー同期、Visual、390px、LINE内ブラウザは未確認。腹式・立ち木の共通化後実機、tree-v3読み/左右全行程も未確認。数息観の既公開PR #17版についてのユーザー完走・同期・発音確認は既存記録を維持し、今回修復版の実機PASSへ転用しない。

PR #23は未変更・未merge。共通化等価性とQ-05修復を別PR/コミットでレビューする。Q-05採用後、PR #23を最新mainへ追随し、既知不具合を記録するテストの期待値を修復の受入条件に合わせて再実行する必要がある。立ち木FB-13/FB-14は独立バックログのまま。
