"""Generate Jaw Release pilot audio with pyopenjtalk-plus 0.4.1.post10."""
import json
import wave
from pathlib import Path

import numpy as np
import pyopenjtalk

DEST = Path(__file__).resolve().parents[1] / "src/assets/jaw-release"
INTRO = "くちびるを軽く閉じ、上下の歯を少し離します。したさきは、上の前歯のすぐ後ろに軽く置きます。鼻で自然に呼吸し、あごの力みをごびょう観察してから、よんびょう休みます。いっかいめを始めます。"
COUNT = ["ご。", "よん。", "さん。", "に。", "いち。"]
ROUNDS = ["にかいめ。", "さんかいめ。", "よんかいめ。", "ごかいめ。", "お疲れさまでした。"]


def render(text, speed):
    samples, rate = pyopenjtalk.tts(text, speed=speed)
    return np.rint(np.clip(samples, -32768, 32767)).astype("<i2"), rate


def write(name, samples, rate):
    with wave.open(str(DEST / name), "wb") as file:
        file.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        file.writeframes(samples.tobytes())


intro, rate = render(INTRO, 1.05)
practice = np.zeros(rate * 45, dtype="<i2")
segments = []
for index, next_round in enumerate(ROUNDS):
    for offset, text in enumerate([*COUNT, "ゆるめて。", next_round]):
        start = index * 9 + offset
        limit = 3 if offset == 6 else 1
        samples, clip_rate = render(text, 1.15)
        assert clip_rate == rate and len(samples) < rate * limit, (text, len(samples) / rate)
        practice[start * rate:start * rate + len(samples)] = samples
        segments.append({"start": start, "frames": len(samples), "reading": text})

write("intro.wav", intro, rate)
write("practice.wav", practice, rate)
(DEST / "timing.json").write_text(json.dumps({
    "sampleRate": rate, "introFrames": len(intro), "introReading": INTRO,
    "practiceFrames": len(practice), "segments": segments,
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
