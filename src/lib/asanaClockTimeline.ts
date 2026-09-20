import type { PoseCatalogEntry } from './poseCatalog';
import type { AsanaCueTimed } from './asanaClockRuntime';
import { phraseToAudioKey } from './voiceGuide';

export function buildAsanaClockTimeline(
  entry: PoseCatalogEntry,
  totalMinutes: number,
): AsanaCueTimed[] {
  const totalMs = totalMinutes * 60 * 1000;
  const vg = entry.voiceGuide;
  const timeline: AsanaCueTimed[] = [];

  const add = (atMs: number, text: string, audioKey?: string, priority: 'mandatory' | 'optional' = 'mandatory') => {
    timeline.push({ atMs, text, audioKey: audioKey ?? phraseToAudioKey(text) ?? undefined, priority });
  };

  add(0, vg.intro, vg.introAudioKey);

  for (const cue of vg.firstRound) {
    const atMs = cue.at * 1000;
    if (atMs < totalMs - 35000) {
      add(atMs, cue.text, cue.audioKey);
    }
  }

  const secondRound = vg.secondRound ?? [];
  const reviewStartMs = Math.max(35000, Math.floor(totalMs * 0.45));
  for (const rc of secondRound) {
    const atMs = reviewStartMs + rc.at * 1000;
    if (atMs < totalMs - 35000) {
      add(atMs, rc.text, rc.audioKey);
    }
  }

  if (vg.breathingCue) {
    const atMs = Math.max(0, totalMs - 30000);
    if (atMs < totalMs - 25000) {
      add(atMs, vg.breathingCue, vg.breathingCueAudioKey);
    }
  }

  if (totalMs >= 90000) add(totalMs - 30000, 'あと30秒です。', undefined, 'optional');
  if (totalMs >= 45000) add(totalMs - 15000, 'あと15秒です。', undefined, 'optional');
  add(totalMs - 5000, 'あと少しです。', undefined, 'optional');

  const completionText = vg.completion ?? 'お疲れさまでした。';
  add(totalMs, completionText, vg.completionAudioKey);

  timeline.sort((a, b) => a.atMs - b.atMs);
  return timeline;
}
