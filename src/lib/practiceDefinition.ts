import type { BreathworkCatalogEntry, BreathworkPattern } from './breathworkCatalog';
import type { KnowledgeLink, PoseCatalogEntry } from './poseCatalog';
import type { PracticeCue } from './practiceAudioRuntime';

export type PracticeTiming =
  | { mode: 'narration_then_silence'; pattern: BreathworkPattern; plannedHoldSec: number; narrationConsumesHold: false }
  | { mode: 'narration_then_hold'; holds: { side: 'right' | 'left'; seconds: number }[]; narrationConsumesHold: false }
  | { mode: 'phase_minimum_and_voice_end'; pattern: BreathworkPattern }
  | { mode: 'wall_clock_with_voice_drain'; plannedSec: number }
  | { mode: 'media_narration_then_silence'; narrationSec: number; silenceSec: number; clock: 'audio.currentTime_then_performance'; audioPath: string };

/** A read contract, not a scheduler. Existing catalogs remain the content owner. */
export interface PracticeDefinition<TContent = unknown> {
  schemaVersion: 1;
  practiceId: string;
  kind: 'asana' | 'breath' | 'meditation';
  contentRevision: string;
  source: { catalogPath: string; baselineCommit: string };
  content: TContent;
  timing: PracticeTiming;
  guide: { cues: PracticeCue[]; completion: 'required_audio_ended'; reading: 'separate_display_and_speech' };
  knowledge: { catalogReference: KnowledgeLink; sourceVerification: 'unconfirmed' };
  review: { fullAudioCaptionSync: 'unconfirmed'; pronunciation: 'unconfirmed'; independentSafety: 'unconfirmed' };
}

/** Only this existing practice is wired through the contract in the first pilot. */
export function defineAbdominalPractice(entry: BreathworkCatalogEntry, cues: PracticeCue[]): PracticeDefinition<BreathworkCatalogEntry> {
  if (entry.id !== 'abdominal-breathing' || !entry.pattern) throw new Error('Abdominal contract requires its existing catalog pattern');
  const p = entry.pattern;
  return {
    schemaVersion: 1, practiceId: entry.id, kind: 'breath', contentRevision: 'abdominal-existing-v1',
    source: { catalogPath: 'src/lib/breathworkCatalog.ts', baselineCommit: '05666f44134f5116998dc31d622e0830ef5ed599' },
    content: entry,
    timing: { mode: 'narration_then_silence', pattern: p, plannedHoldSec: (p.inhaleSec + p.holdAfterInhaleSec + p.exhaleSec + p.holdAfterExhaleSec) * p.rounds, narrationConsumesHold: false },
    // Preserve array identity, IDs, optional fields, speech, order and durations.
    guide: { cues, completion: 'required_audio_ended', reading: 'separate_display_and_speech' },
    knowledge: { catalogReference: entry.knowledge, sourceVerification: 'unconfirmed' },
    review: { fullAudioCaptionSync: 'unconfirmed', pronunciation: 'unconfirmed', independentSafety: 'unconfirmed' },
  };
}

export interface ContractIssue { practiceId: string; code: string; detail: string }

/** Second pilot: retain the already-built tree guide and catalog by reference. */
export function defineTreePractice(entry: PoseCatalogEntry, cues: PracticeCue[]): PracticeDefinition<PoseCatalogEntry> {
  if (entry.id !== 'vrksasana') throw new Error('Tree contract requires the existing vrksasana catalog');
  return {
    schemaVersion: 1, practiceId: entry.id, kind: 'asana', contentRevision: 'tree-existing-v1',
    source: { catalogPath: 'src/lib/poseCatalog.ts', baselineCommit: 'cabf5e00490758477c83846d661475cdca59748b' },
    content: entry,
    timing: { mode: 'narration_then_hold', holds: cues.filter(c => c.type === 'silence').map(c => ({ side: c.side!, seconds: c.durationSec! })), narrationConsumesHold: false },
    guide: { cues, completion: 'required_audio_ended', reading: 'separate_display_and_speech' },
    knowledge: { catalogReference: entry.knowledge, sourceVerification: 'unconfirmed' },
    review: { fullAudioCaptionSync: 'unconfirmed', pronunciation: 'unconfirmed', independentSafety: 'unconfirmed' },
  };
}

/** Used by registration tooling/tests, never changes the running session or its safety gate. */
export function validatePracticeDefinitions(definitions: PracticeDefinition[]): ContractIssue[] {
  const issues: ContractIssue[] = [], ids = new Set<string>();
  for (const d of definitions) {
    const add = (code: string, detail: string) => issues.push({ practiceId: d.practiceId, code, detail });
    if (!d.practiceId.trim() || ids.has(d.practiceId)) add('identity', 'Stable ID must be nonempty and unique');
    ids.add(d.practiceId);
    if (d.schemaVersion !== 1 || !d.contentRevision || !d.source.catalogPath || !d.source.baselineCommit) add('provenance', 'Version and catalog baseline are required');
    const cueIds = new Set<string>();
    for (const cue of d.guide.cues) {
      if (!cue.id || cueIds.has(cue.id)) add('cue-id', 'Cue IDs must be nonempty and unique');
      cueIds.add(cue.id);
      if (cue.type === 'voice') {
        if (!cue.displayText || !cue.speechText) add('narration', 'Display and speech text are required separately');
        if (/吐きます|吐いて|吐く/.test(cue.speechText ?? '')) add('pronunciation', 'Explicit breathing kana is required; this does not certify recorded pronunciation');
      }
      for (const seconds of [cue.durationSec, cue.phaseDurationSec]) {
        if (seconds !== undefined && (!Number.isFinite(seconds) || seconds <= 0)) add('duration', 'Cue durations must be finite positive seconds');
      }
    }
    if (d.guide.completion !== 'required_audio_ended' || d.guide.reading !== 'separate_display_and_speech') add('audio-gate', 'Keep completion after required audio and separate readings');
    if (d.guide.cues.filter(c => c.type === 'complete').length !== 1 || d.guide.cues[d.guide.cues.length - 1]?.type !== 'complete') add('completion', 'One completion cue must follow the complete guide');
    if (d.timing.mode === 'narration_then_silence' || d.timing.mode === 'phase_minimum_and_voice_end') {
      const p = d.timing.pattern, values = [p.inhaleSec, p.holdAfterInhaleSec, p.exhaleSec, p.holdAfterExhaleSec];
      if (values.some(v => !Number.isFinite(v) || v < 0) || !Number.isInteger(p.rounds) || p.rounds < 1) add('pattern', 'Nonnegative phase seconds and positive integer rounds are required');
      if (d.timing.mode === 'narration_then_silence') {
        const roundCount = Number.isInteger(p.rounds) && p.rounds > 0 ? Math.min(p.rounds, 1000) : 0;
        const expected = Array.from({ length: roundCount }, () => values.filter(v => v > 0)).flat();
        const actual = d.guide.cues.filter(c => c.type === 'silence').map(c => c.durationSec);
        if (JSON.stringify(actual) !== JSON.stringify(expected) || d.timing.plannedHoldSec !== values.reduce((a, b) => a + b, 0) * p.rounds || d.timing.narrationConsumesHold !== false) add('hold-order', 'Narration must not consume planned holds; preserve phase order and rounds');
      }
    }
    if (d.timing.mode === 'narration_then_hold') {
      const holds = d.timing.holds;
      if (holds.length !== 2 || holds[0].side !== 'right' || holds[1].side !== 'left' || holds.some(h => !Number.isFinite(h.seconds) || h.seconds <= 0) || holds[0].seconds !== holds[1].seconds || d.timing.narrationConsumesHold !== false) add('bilateral', 'Right and left holds must be equal and exclude guidance');
      const actual = d.guide.cues.filter(c => c.type === 'silence').map(c => ({ side: c.side, seconds: c.durationSec }));
      if (JSON.stringify(actual) !== JSON.stringify(holds)) add('bilateral-guide', 'Declared holds must match the existing right/left guide');
    }
    if (d.practiceId === 'susokukan-5min' && (d.timing.mode !== 'media_narration_then_silence' || d.timing.narrationSec !== 60 || d.timing.silenceSec !== 240 || d.timing.clock !== 'audio.currentTime_then_performance' || d.timing.audioPath !== '/voice/susokukan-intro-full-v2.wav')) add('susokukan-clock', 'Keep the dedicated 60-second media clock and 240-second silence');
  }
  return issues;
}
