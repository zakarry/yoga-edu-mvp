import json
import math
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
        [[move(3, "両方のほっぺたをふくらませます。", "りょうほうの、ほっぺたをふくらませます。", "cheeks"),
          cue("解除・休息", 9, "両方のほっぺたをゆるめます。", "りょうほうの、ほっぺたをゆるめます。", "rest")]] * 5),
    "simhasana": draft("Simhasana Face｜ライオンの顔", "伝統の応用",
        "ライオンの顔の練習です。椅子に楽に座り、両手を膝に置いて、手の指を広げます。鼻から息を吸ったあと、口を無理のない範囲で開け、舌を顎の方へ出しながら、口から息を吐きます。声は出しません。そのあと舌を戻し、口を閉じて、鼻で自然に呼吸します。これを3回くり返します。",
        "らいおんのかおのれんしゅうです。いすにらくにすわり、りょうてをひざにおいて、てのゆびをひろげます。はなからいきをすったあと、くちをむりのないはんいであけ、したをあごのほうへだしながら、くちからいきをはきます。こえはだしません。そのあとしたをもどし、くちをとじて、はなでしぜんにこきゅうします。これをさんかいくりかえします。",
        "鼻から吸う → 口を開けて舌を出し、口から吐く → 舌を戻して口を閉じ、鼻で呼吸。時間配分は監修待ち。", "開口範囲・呼気音・原典との差",
        [[move(4, "鼻から楽に息を吸います。", "はなかららくにいきをすいます。", "rest"),
          move(4, "口を開けて舌を出し、息を吐きます。", "くちをあけてしたをだし、いきをはきます。", "lion"),
          cue("解除・休息", 12, "舌を戻して口を閉じ、鼻から吸って吐く呼吸を2回くり返します。", "したをもどして、くちをとじ、はなからすってはくこきゅうを、にかいくりかえします。", "rest")]] * 3),
    "tongue": draft("Tongue Mobility｜舌", "現代",
        "舌を前、右、左へ動かす段階を確認します。顎は動かさず、鼻で自然に呼吸します。",
        "したを、まえ、みぎ、ひだりへうごかすだんかいをかくにんします。あごはうごかさず、はなでしぜんにこきゅうします。",
        "鼻で自然に呼吸", "上あごへの抵抗運動の採否",
        [[move(3, "舌を前へ", "したをまえへ。", "tongue-front"), rest(3, "舌を戻して休む。", "したをもどしてやすむ。")]] * 3 +
        [[move(3, "舌先を右へ", "したさきをみぎへ。", "tongue-right"), rest(3, "中央へ戻す。", "ちゅうおうへもどす。"),
          move(3, "舌先を左へ", "したさきをひだりへ。", "tongue-left"), rest(5, "中央へ戻して休む。", "ちゅうおうへもどしてやすむ。")]] * 3),
    "lip": draft("Lip O–Smile｜口元の切替", "現代",
        "歯を噛み合わせず、唇を「オ」の形にしてとがらせて、小さくほほえんでみましょう。鼻で自然に呼吸します。",
        "はをかみあわせず、くちびるを、おのかたちにして、とがらせて、ちいさくほほえんでみましょう。はなでしぜんにこきゅうします。",
        "鼻で自然に呼吸", "安全文言",
        [[dict(move(2, "唇を「オ」の形にしてとがらせて。", "くちびるを、おのかたちにして、とがらせて。", "o"), narrationBeforeHold=True), move(2, "小さくほほえんで。", "ちいさくほほえんで。", "smile"), rest(8)]] * 5),
    "smile": draft("Smile Balance｜笑顔の左右", "現代",
        "口の両端をゆっくり上げ、小さくほほえんでみましょう。鏡で動きを見てみます。左右を無理にそろえません。",
        "くちのりょうはしをゆっくりあげ、ちいさくほほえんでみましょう。かがみでうごきをみてみます。さゆうをむりにそろえません。",
        "鼻で自然に呼吸", "安全文言・緊急案内",
        [[move(3, "小さくほほえんで。", "ちいさくほほえんで。", "smile"), rest(12, "鏡で、左右どちらの口角が先に上がるか確かめます。違いがあっても無理にそろえず、口元の力を抜いて休みます。", "かがみで、さゆうどちらのこうかくがさきにあがるかたしかめます。ちがいがあってもむりにそろえず、くちもとのちからをぬいてやすみます。")]] * 5),
    "griva": draft("Griva Gentle｜首", "原本では伝統・分類は監修待ち",
        "首の向きを確認します。原典の一部を参照した段階見本です。",
        "くびのむきをかくにんします。げんてんのいちぶをさんしょうした、だんかいみほんです。",
        "吐きながら向く・吸いながら正面に戻る", "分類・首の安全文言",
        [[move(4, "吐きながら右を向いて。", "はきながらみぎをむいて。", "neck-right"), move(4, "吸いながら正面へ戻して。", "すいながらしょうめんへもどして。", "rest"),
          move(4, "吐きながら左を向いて。", "はきながらひだりをむいて。", "neck-left"), move(4, "吸いながら正面へ戻して。", "すいながらしょうめんへもどして。", "rest")]] * 3 +
        [[move(4, "吐きながら前屈", "はきながらまえへ。", "neck-down"), move(4, "吸いながら戻る", "すいながらもどります。", "rest"), rest(4)]]),
    "relax": draft("Face Relax｜顔の脱力", "伝統の応用",
        "椅子に楽に座ります。額、眉間、目元、ほっぺた、顎の順に、力を抜いていきましょう。鼻から自然に呼吸してください。",
        "いすにらくにすわります。ひたい、みけん、めもと、ほっぺた、あごのじゅんに、ちからをぬいていきましょう。はなからしぜんにこきゅうしてください。",
        "鼻で自然に呼吸。回数は原本内で3回と3～4回が併記。", "自然呼吸の回数・安全文言",
        [[move(8, "額と眉間の力を抜いて。", "ひたいと、みけんのちからをぬいて。", "brow"), move(8, "目元とほっぺたをゆるめて。", "めもとと、ほっぺたをゆるめて。", "cheeks"),
          move(8, "顎と舌の力を抜いて。", "あごと、したのちからをぬいて。", "tongue-front"), move(28, "鼻から自然に呼吸してください。", "はなからしぜんにこきゅうしてください。", "rest"),
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
    blocks = []
    start = 0
    for number, row in enumerate(item.pop("rounds"), 1):
        for phase in row:
            phase = phase.copy()
            clip = render(phase["reading"])
            narration_sec = math.ceil(len(clip) / RATE) if phase.pop("narrationBeforeHold", False) else 0
            duration = phase["seconds"] + narration_sec
            assert 0 < len(clip) < (narration_sec or duration) * RATE, (key, phase, len(clip) / RATE)
            block = np.zeros(duration * RATE, dtype="<i2")
            block[:len(clip)] = clip
            blocks.append(block)
            item["segments"].append(dict(phase, seconds=duration, narrationSec=narration_sec,
                                         start=start, frames=len(clip), round=number))
            start += duration
    practice = np.concatenate(blocks)
    item["practiceAudioSec"] = start
    transition = render("ここで、このしゅもくをおわります。")
    item["transitionFrames"] = len(transition)
    item["transitionCaption"] = "ここで、この種目を終わります。"
    item["transitionReading"] = "ここで、このしゅもくをおわります。"
    write(f"{key}-intro.wav", intro)
    write(f"{key}-practice.wav", practice)
    write(f"{key}-transition.wav", transition)

(DEST / "timing.json").write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
