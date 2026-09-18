import type { PoseCatalogEntry } from './poseCatalog';
import type { PracticeCue } from './practiceAudioRuntime';

export function buildAsanaCues(entry: PoseCatalogEntry, totalMinutes: number): PracticeCue[] {
  const cues: PracticeCue[] = [];
  const totalSeconds = totalMinutes * 60;
  const vg = entry.voiceGuide;
  let idx = 0;
  const add = (cue: Omit<PracticeCue, 'id'>) => {
    cues.push({ ...cue, id: `asana-${entry.id}-${idx++}` });
  };

  add({ type: 'voice', displayText: vg.intro, speechText: vg.intro, audioKey: vg.introAudioKey });

  for (const cue of vg.firstRound) {
    if (cue.at < totalSeconds - 35) {
      add({ type: 'voice', displayText: cue.text, speechText: cue.text, audioKey: cue.audioKey });
    }
  }

  if (vg.breathingCue) {
    const breathAt = Math.max(0, totalSeconds - 30);
    if (breathAt < totalSeconds - 25) {
      add({ type: 'voice', displayText: vg.breathingCue, speechText: vg.breathingCue, audioKey: vg.breathingCueAudioKey, isFinalCue: true });
    }
  }

  const secondRound = vg.secondRound ?? [];
  const reviewStart = Math.max(35, Math.floor(totalSeconds * 0.45));
  for (const rc of secondRound) {
    const at = reviewStart + rc.at;
    if (at < totalSeconds - 35) {
      add({ type: 'voice', displayText: rc.text, speechText: rc.text, audioKey: rc.audioKey });
    }
  }

  if (vg.breathingReminderCue) {
    const noseReminderAt = Math.min(totalSeconds - 40, reviewStart + 25);
    if (noseReminderAt > reviewStart && noseReminderAt < totalSeconds - 30) {
      add({ type: 'voice', displayText: vg.breathingReminderCue, speechText: vg.breathingReminderCue });
    }
  }

  add({ type: 'voice', displayText: 'あと30秒です。', speechText: 'あと30秒です。' });
  add({ type: 'voice', displayText: 'あと15秒です。', speechText: 'あと15秒です。' });
  add({ type: 'voice', displayText: 'あと少しです。', speechText: 'あと少しです。' });

  const completionText = vg.completion ?? 'お疲れさまでした。';
  add({ type: 'voice', displayText: completionText, speechText: completionText, audioKey: vg.completionAudioKey });
  add({ type: 'voice', displayText: '次のポーズへ進みます。', speechText: '次のポーズへ進みます。' });
  add({ type: 'complete', displayText: 'お疲れさまでした。', isFinalCue: true });

  return cues;
}
