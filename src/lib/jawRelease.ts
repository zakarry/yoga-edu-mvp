import audioTiming from '../assets/jaw-release/timing.json' with { type: 'json' };
import type { PracticeDefinition } from './practiceDefinition';
import type { PracticeCue } from './practiceAudioRuntime';

const rounds = Array.from({ length: 5 }, (_, index): PracticeCue[] => [
  { id: 'hold-' + index, type: 'silence', durationSec: 5, displayRound: index + 1, displayText: '顎の力を抜いたまま保ちます。鼻で自然に呼吸します。' },
  { id: 'rest-' + index, type: 'silence', durationSec: 4, displayRound: index + 1, displayText: '顎の力を抜いて休みます。' },
]);

export const jawRelease = {
  schemaVersion: 1,
  practiceId: 'face-balance-jaw-release',
  kind: 'face',
  contentRevision: 'v0.5-pilot',
  source: { catalogPath: 'src/lib/jawRelease.ts', baselineCommit: 'e213cbd0381ed4de904fa4474af06d23af25a87f' },
  content: { name: 'Jaw Release｜顎の脱力', classification: '現代' },
  timing: { mode: 'narration_then_repeated_hold', plannedSec: 45 },
  guide: {
    completion: 'required_audio_ended',
    reading: 'separate_display_and_speech',
    cues: [
      {
        id: 'intro', type: 'voice',
        displayText: '唇を軽く閉じ、上下の歯を少し離します。舌先は上の前歯のすぐ後ろに軽く置きます。鼻で自然に呼吸し、顎の力を抜いたまま5秒保ち、そのあと4秒休みます。1回目を始めます。',
        speechText: audioTiming.introReading, audioKey: 'jaw-release-intro',
      },
      ...rounds.flat(),
      { id: 'complete', type: 'complete' },
    ],
  },
  knowledge: { catalogReference: { verified: false, professionalYogaRelated: null }, sourceVerification: 'unconfirmed' },
  review: { fullAudioCaptionSync: 'unconfirmed', pronunciation: 'unconfirmed', independentSafety: 'unconfirmed' },
} satisfies PracticeDefinition<{ name: string; classification: string }>;
