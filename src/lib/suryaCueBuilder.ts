import type { SequenceCatalogEntry, SequenceStep } from './sequenceCatalog';
import type { PracticeCue } from './practiceAudioRuntime';

type Side = 'right' | 'left';

const STEP_DURATIONS = {
  beginner:    [7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7],
  standard:    [5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5],
  experienced: [4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4],
} as const;

export type TempoMode = keyof typeof STEP_DURATIONS;

function getStepAudioKey(step: SequenceStep, side: Side): string | undefined {
  if (side === 'left' && step.audioKeyLeft) return step.audioKeyLeft;
  return step.audioKey;
}

function getStepVoiceGuide(step: SequenceStep, side: Side): string[] {
  if (side === 'left' && step.voiceGuideLeft) return step.voiceGuideLeft;
  return step.voiceGuide;
}

export function buildSuryaCues(
  entry: SequenceCatalogEntry,
  tempo: TempoMode = 'standard',
): PracticeCue[] {
  const cues: PracticeCue[] = [];
  let idx = 0;
  const add = (cue: Omit<PracticeCue, 'id'>) => {
    cues.push({ ...cue, id: `surya-${idx++}` });
  };

  for (const side of ['right', 'left'] as Side[]) {
    for (const step of entry.steps) {
      const audioKey = getStepAudioKey(step, side);
      const voiceGuide = getStepVoiceGuide(step, side);
      const text = voiceGuide[0] ?? step.nameJa;
      const durationSec = STEP_DURATIONS[tempo][step.stepNumber - 1] ?? 6;
      add({ type: 'voice', displayText: text, speechText: text, audioKey });
      add({ type: 'silence', durationSec });
    }
    if (side === 'right') {
      add({ type: 'voice', displayText: '右側が終わりました。次は左側です。', speechText: '右側が終わりました。次は左側です。', audioKey: 'voice-surya-transition' });
    }
  }

  add({ type: 'complete', displayText: '左右の太陽礼拝が終わりました。お疲れさまでした。', isFinalCue: true });
  return cues;
}

export { STEP_DURATIONS };
