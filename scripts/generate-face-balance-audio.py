import json
import wave
from pathlib import Path

import numpy as np
import pyopenjtalk

DEST = Path(__file__).resolve().parents[1] / "src/assets/face-balance"
DEST.mkdir(exist_ok=True)
RATE = 16000

# Each tuple is phase, duration, caption, explicit speech reading, visual.
def cue(phase, seconds, caption, reading, visual):
    return dict(phase=phase, seconds=seconds, caption=caption, reading=reading, visual=visual)

def rest(seconds, text="力を抜いて休みます。", reading="ちからをぬいて、やすみます。"):
    return cue("解除・休息", seconds, text, reading, "rest")

def move(seconds, caption, reading, visual):
    return cue("実践", seconds, caption, reading, visual)

def draft(name, classification, intro, reading, breath, review, rounds):
    return dict(name=name, classification=classification, intro=intro, introReading=reading,
                breath=breath, review=review, rounds=rounds)

items = {
    "kapola": draft("Kapola Awareness｜頬", "伝統の応用",
        "カポーラの動作確認です。呼吸指示は監修待ちです。",
        "かぽーらのどうさかくにんです。こきゅうしじはかんしゅうまちです。",
        "監修待ち。呼吸の実践指示を収録していません。", "頬をふくらませる動作と呼吸の組み合わせ",
        [[move(3, "両ほおをふくらませます。", "りょうほおをふくらませます。", "cheeks"),
          cue("解除・休息", 9, "ほおをゆるめて休みます。", "ほおをゆるめてやすみます。", "rest")]] * 5),
    "simhasana": draft("Simhasana Face｜ライオンの顔", "伝統の応用",
        "シンハーサナの段階確認です。開口範囲と呼気音は監修待ちです。",
        "しんはーさなのだんかいかくにんです。かいこうはんいとこきおんは、かんしゅうまちです。",
        "鼻から吸う → 口から吐く → 鼻で2呼吸休む。段階表示用の仮配分。", "開口範囲・呼気音・原典との差",
        [[move(4, "鼻から吸う段階", "はなからすうだんかい。", "rest"),
          move(4, "口から吐く段階・開口範囲は監修待ち", "くちからはくだんかい。", "lion"),
          cue("解除・休息", 12, "鼻で2呼吸休みます。", "はなで、ふたこきゅうやすみます。", "rest")]] * 3),
    "tongue": draft("Tongue Mobility｜舌", "現代",
        "舌を前、右、左へ動かす段階を確認します。顎は動かさず、鼻で自然に呼吸します。",
        "したを、まえ、みぎ、ひだりへうごかすだんかいをかくにんします。あごはうごかさず、はなでしぜんにこきゅうします。",
        "鼻で自然に呼吸", "上あごへの抵抗運動の採否",
        [[move(3, "舌を前へ", "したをまえへ。", "tongue-front"), rest(3, "舌を戻して休む。", "したをもどしてやすむ。")]] * 3 +
        [[move(3, "舌先を右へ", "したさきをみぎへ。", "tongue-right"), rest(3, "中央へ戻す。", "ちゅうおうへもどす。"),
          move(3, "舌先を左へ", "したさきをひだりへ。", "tongue-left"), rest(5, "中央へ戻して休む。", "ちゅうおうへもどしてやすむ。")]] * 3),
    "lip": draft("Lip O–Smile｜口元の切替", "現代",
        "歯を噛み合わせず、オの形から、小さくほほえんでみましょう。鼻で自然に呼吸します。",
        "はをかみあわせず、おのかたちから、ちいさくほほえんでみましょう。はなでしぜんにこきゅうします。",
        "鼻で自然に呼吸", "安全文言",
        [[move(2, "「オ」の形", "おのかたち。", "o"), move(2, "小さくほほえんで。", "ちいさくほほえんで。", "smile"), rest(8)]] * 5),
    "smile": draft("Smile Balance｜笑顔の左右", "現代",
        "口の両端をゆっくり上げ、小さくほほえんでみましょう。鏡で動きを見てみます。左右を無理にそろえません。",
        "くちのりょうはしをゆっくりあげ、ちいさくほほえんでみましょう。かがみでうごきをみてみます。さゆうをむりにそろえません。",
        "鼻で自然に呼吸", "安全文言・緊急案内",
        [[move(3, "小さくほほえんで。", "ちいさくほほえんで。", "smile"), rest(12, "鏡で、口の両端の動きを見てみましょう。そのあと力を抜いて休みます。", "かがみで、くちのりょうはしのうごきをみてみましょう。そのあと、ちからをぬいてやすみます。")]] * 5),
    "griva": draft("Griva Gentle｜首", "原本では伝統・分類は監修待ち",
        "首の向きを確認します。原典の一部を参照した段階見本です。",
        "くびのむきをかくにんします。げんてんのいちぶをさんしょうした、だんかいみほんです。",
        "吐きながら向く・吸いながら正面に戻る", "分類・首の安全文言",
        [[move(4, "吐きながら右へ", "はきながらみぎへ。", "neck-right"), move(4, "吸いながら正面へ", "すいながらしょうめんへ。", "rest"),
          move(4, "吐きながら左へ", "はきながらひだりへ。", "neck-left"), move(4, "吸いながら正面へ", "すいながらしょうめんへ。", "rest")]] * 3 +
        [[move(4, "吐きながら前屈", "はきながらまえへ。", "neck-down"), move(4, "吸いながら戻る", "すいながらもどります。", "rest"), rest(4)]]),
    "relax": draft("Face Relax｜顔の脱力", "伝統の応用",
        "椅子に座ったまま、顔の力みに順番に気づきます。呼吸は自然なペースです。",
        "いすにすわったまま、かおのちからみにじゅんばんにきづきます。こきゅうはしぜんなぺーすです。",
        "鼻で自然に呼吸。回数は原本内で3回と3～4回が併記。", "自然呼吸の回数・安全文言",
        [[move(8, "額と眉間", "ひたいとみけん。", "brow"), move(8, "目元と頬", "めもととほお。", "cheeks"),
          move(8, "顎と舌", "あごとした。", "tongue-front"), move(28, "自然な呼吸", "しぜんなこきゅう。", "rest"),
          cue("解除・休息", 8, "ゆっくり目を開けて、鏡でいまの表情を見てみましょう。", "ゆっくりめをあけて、かがみでいまのひょうじょうをみてみましょう。", "rest")]]),
}

def render(text):
    samples, rate = pyopenjtalk.tts(text, speed=1.08)
    assert rate == 3 * RATE
    samples = samples[:len(samples) // 3 * 3].reshape(-1, 3).mean(axis=1)
    return np.rint(np.clip(samples, -32768, 32767)).astype("<i2")

def write(name, samples):
    with wave.open(str(DEST / name), "wb") as file:
        file.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        file.writeframes(samples.tobytes())

for key, item in items.items():
    intro = render(item["introReading"])
    item["sampleRate"] = RATE
    item["introFrames"] = len(intro)
    item["segments"] = []
    item["practiceSec"] = sum(c["seconds"] for r in item["rounds"] for c in r)
    practice = np.zeros(item["practiceSec"] * RATE, dtype="<i2")
    start = 0
    for number, row in enumerate(item.pop("rounds"), 1):
        for phase in row:
            clip = render(phase["reading"])
            assert 0 < len(clip) < phase["seconds"] * RATE, (key, phase, len(clip) / RATE)
            practice[start * RATE:start * RATE + len(clip)] = clip
            item["segments"].append(dict(phase, start=start, frames=len(clip), round=number))
            start += phase["seconds"]
    transition = render("ここで、このしゅもくをおわります。")
    item["transitionFrames"] = len(transition)
    item["transitionCaption"] = "ここで、この種目を終わります。"
    item["transitionReading"] = "ここで、このしゅもくをおわります。"
    write(f"{key}-intro.wav", intro)
    write(f"{key}-practice.wav", practice)
    write(f"{key}-transition.wav", transition)

(DEST / "timing.json").write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
