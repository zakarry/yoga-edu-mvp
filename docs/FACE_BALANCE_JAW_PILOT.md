# FACE BALANCE YOGA Jaw Release 試作

開発サーバーで `/jaw-release.html` を開く。説明と実践に同梱の日本語WAVを使う。既存のPractice登録契約で種目・案内・フェーズを定義し、既存の製品カタログや実践記録から分離する。

説明の正常終了後に数値タイマーを開始する。5秒の観察と4秒の解除・休息を5周で45秒。実践中は字幕・模式図・回数と数値を同じ時計で更新する。実践WAVの再生位置を時計に使う。各周の0～4秒に5から1のカウント、5秒に解除、6秒に次回の案内を置く。最終周の6秒では終了の挨拶を再生する。停止、離脱、音声異常で再生を破棄し、実践完了はWAVの正常終了で表示する。

5分コース案は Jaw Release → Kapola Awareness → Tongue Mobility → Smile Balance → Face Relax。原本の実践枠で合計300秒。説明・切替は別枠。構成と安全条件は監修待ち。

監修待ちの項目は顎の開口範囲、安全文言、端末ごとの発音と末尾、カポーラの呼吸、シンハーサナの原典との差、グリーヴァの分類。左右差改善や小顔の効果をうたわない。

検証は型チェック、Build、全回帰、既存ブラウザ回帰とJaw専用ブラウザ回帰を分ける。Jawのブラウザテストは実WAVを再生し、異常通知だけを注入する。発音、音声の聞こえ方、Galaxy Chrome／LINE内ブラウザでの実聴は未確認。

## 音源

説明 15.715秒、実践 45.000秒。48 kHz、モノラルPCM。35キューの実尺は0.645～1.445秒。保持カウントの最長は0.815秒で、次の秒境界までに収まる。各キューのサンプル数と開始秒を timing.json に記録。生成時にクリップが割当枠に収まることを検査し、ブラウザ回帰でWAVヘッダとキュー間の無音を検査する。

音声モデルは HTS Voice “Mei” © 2009–2013 Nagoya Institute of Technology, MMDAgent Project Team。[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)。[モデルのライセンス](https://github.com/r9y9/pyopenjtalk/blob/master/pyopenjtalk/htsvoice/LICENSE_mei_normal.htsvoice)。pyopenjtalk-plus 0.4.1.post10 を使い、日本語原稿を合成して45秒の実践トラックに編集した。生成コマンドは python scripts/generate-jaw-release-audio.py。アプリの依存追加はなし。