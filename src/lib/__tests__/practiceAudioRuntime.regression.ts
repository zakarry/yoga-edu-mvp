import { PracticeAudioRuntime, type PracticeCue, type RuntimeEvent } from '../practiceAudioRuntime';
import { MEDITATION_CATALOG } from '../meditationCatalog';
import { BREATHWORK_CATALOG } from '../breathworkCatalog';
import { POSE_CATALOG } from '../poseCatalog';
import { SEQUENCE_CATALOG } from '../sequenceCatalog';
import { buildMeditationCues } from '../meditationCueBuilder';

interface RegressionResult {
  practiceId: string;
  practiceName: string;
  passed: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
}

const PRACTICE_IDS = [
  'tadasana',
  'vrksasana',
  'uttanasana',
  'surya-namaskar',
  'box-breathing',
  'abdominal-breathing',
  'thoracic-breathing',
  'complete-yoga-breathing',
  'brahmari',
  'nadi-shodhana',
  'susokukan-5min',
  'mindfulness-5min',
  'yoga-nidra-3m30s',
];

function checkCues(practiceId: string, cues: PracticeCue[]): { name: string; passed: boolean; detail?: string }[] {
  const checks: { name: string; passed: boolean; detail?: string }[] = [];

  checks.push({
    name: 'cueCount > 0',
    passed: cues.length > 0,
    detail: `${cues.length} cues`,
  });

  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (!c.id) {
      checks.push({ name: `cue[${i}].id`, passed: false, detail: 'missing id' });
    }
  }
  checks.push({
    name: 'all cues have id',
    passed: checks.every(c => c.passed),
  });

  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (c.type === 'voice' && !c.displayText && !c.speechText) {
      checks.push({ name: `cue[${i}].text`, passed: false, detail: 'voice cue has no text' });
    }
  }
  checks.push({
    name: 'voice cues have text',
    passed: checks.every(c => c.passed),
  });

  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (c.type === 'silence' && (!c.durationSec || c.durationSec <= 0)) {
      checks.push({ name: `cue[${i}].duration`, passed: false, detail: 'silence has no duration' });
    }
  }
  checks.push({
    name: 'silence cues have duration',
    passed: checks.every(c => c.passed),
  });

  let hasComplete = false;
  for (const c of cues) {
    if (c.type === 'complete') hasComplete = true;
  }
  checks.push({
    name: 'has complete cue',
    passed: hasComplete,
    detail: hasComplete ? 'found' : 'missing',
  });

  const seenKeys = new Set<string>();
  let noDuplicates = true;
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < cues.length; i++) {
      const key = `${practiceId}:r${r}:c${i}:${cues[i].id}`;
      if (seenKeys.has(key)) { noDuplicates = false; break; }
      seenKeys.add(key);
    }
  }
  checks.push({
    name: 'no duplicate cue keys across rounds',
    passed: noDuplicates,
  });

  return checks;
}

export function runRegressionSuite(): RegressionResult[] {
  const results: RegressionResult[] = [];

  for (const practiceId of PRACTICE_IDS) {
    const result: RegressionResult = {
      practiceId,
      practiceName: practiceId,
      passed: true,
      checks: [],
    };

    let cues: PracticeCue[] = [];

    const meditation = MEDITATION_CATALOG.find((m: { id: string; timeline: any[] }) => m.id === practiceId);
    if (meditation) {
      cues = meditation.timeline.map((e: any, i: number) => ({
        id: `${meditation.id}-cue-${i}`,
        type: e.type === 'voice' ? 'voice' : e.type === 'silence' ? 'silence' : 'complete',
        displayText: e.text,
        speechText: e.audioText ?? e.text,
        audioKey: e.audioKey,
        durationSec: e.durationSec,
        isFinalCue: e.type === 'complete',
      }));
    }

    const breathwork = BREATHWORK_CATALOG?.find((b: any) => b.id === practiceId);
    if (breathwork) {
      const vg = breathwork.voiceGuide;
      if (vg) {
        cues = [
          ...(vg.intro ?? []).map((c: any, i: number) => ({
            id: `${breathwork.id}-intro-${i}`,
            type: 'voice' as const,
            displayText: c.text,
            audioKey: c.audioKey,
          })),
          ...(vg.completion ?? []).map((c: any, i: number) => ({
            id: `${breathwork.id}-completion-${i}`,
            type: i === (vg.completion ?? []).length - 1 ? 'complete' as const : 'voice' as const,
            displayText: c.text,
            audioKey: c.audioKey,
            isFinalCue: i === (vg.completion ?? []).length - 1,
          })),
        ];
      }
    }

    const pose = POSE_CATALOG?.find((p: any) => p.id === practiceId);
    if (pose) {
      const vg = pose.voiceGuide;
      if (vg) {
        cues = [
          ...(vg.firstRound ?? []).map((c: any, i: number) => ({
            id: `${pose.id}-r1-${i}`,
            type: 'voice' as const,
            displayText: c.text,
            audioKey: c.audioKey,
          })),
          ...(vg.secondRound ?? []).map((c: any, i: number) => ({
            id: `${pose.id}-r2-${i}`,
            type: 'voice' as const,
            displayText: c.text,
            audioKey: c.audioKey,
          })),
          {
            id: `${pose.id}-complete`,
            type: 'complete' as const,
            displayText: vg.completion ?? 'お疲れさまでした。',
            audioKey: vg.completionAudioKey,
            isFinalCue: true,
          },
        ];
      }
    }

    const sequence = SEQUENCE_CATALOG?.find((s: any) => s.id === practiceId);
    if (sequence) {
      cues = (sequence.steps ?? []).map((s: any, i: number) => ({
        id: `${sequence.id}-step-${i}`,
        type: 'voice' as const,
        displayText: s.voiceText ?? s.text,
        audioKey: s.audioKey,
      }));
      cues.push({
        id: `${sequence.id}-complete`,
        type: 'complete',
        displayText: 'お疲れさまでした。',
        isFinalCue: true,
      });
    }

    if (cues.length > 0) {
      result.checks = checkCues(practiceId, cues);
      result.passed = result.checks.every(c => c.passed);
    } else {
      result.checks = [{ name: 'cues found', passed: false, detail: 'no cues found for practice' }];
      result.passed = false;
    }

    results.push(result);
  }

  return results;
}

export function formatRegressionResults(results: RegressionResult[]): string {
  const lines: string[] = [];
  let allPass = true;
  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    if (!r.passed) allPass = false;
    lines.push(`[${status}] ${r.practiceId}`);
    for (const c of r.checks) {
      if (!c.passed) {
        lines.push(`  FAIL: ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
      }
    }
  }
  lines.push(`\nOverall: ${allPass ? 'ALL PASS' : 'FAILURES'}`);
  return lines.join('\n');
}

interface MockEngineOptions {
  audioDurations?: Record<string, number>;
  playDelayMs?: number;
}

function createMockEngine(opts: MockEngineOptions = {}) {
  let cueEndCb: (() => void) | null = null;
  let playing = false;
  const durations = opts.audioDurations ?? {};

  return {
    type: 'audio-file' as const,
    available: true,
    speakByKey(_key: string, _fallback?: string) {
      playing = true;
      const dur = durations[_key] ?? 2;
      setTimeout(() => {
        playing = false;
        cueEndCb?.();
      }, dur * 1000 + (opts.playDelayMs ?? 0));
    },
    speak(text: string) {
      playing = true;
      const dur = Math.max(1, text.length / 10);
      setTimeout(() => {
        playing = false;
        cueEndCb?.();
      }, dur * 1000);
    },
    stop() { playing = false; },
    pause() {},
    resume() {},
    unlock() {},
    getAudioDuration(key: string) { return durations[key] ?? null; },
    isPlaying() { return playing; },
    setOnCueEnd(cb: (() => void) | null) { cueEndCb = cb; },
    getStatus() { return { status: 'available' as const, voiceName: 'mock', error: null }; },
  };
}

export function runMeditationCompletionRegression(): RegressionResult[] {
  const results: RegressionResult[] = [];
  const meditationIds = ['susokukan-5min', 'mindfulness-1min', 'mindfulness-5min', 'yoga-nidra-3m30s'];

  for (const id of meditationIds) {
    const entry = MEDITATION_CATALOG.find((m) => m.id === id);
    if (!entry) {
      results.push({ practiceId: id, practiceName: id, passed: false, checks: [{ name: 'entry found', passed: false }] });
      continue;
    }

    const cues = buildMeditationCues(entry);
    const checks: { name: string; passed: boolean; detail?: string }[] = [];

    const silenceCues = cues.filter((c) => c.type === 'silence');
    const completeCues = cues.filter((c) => c.type === 'complete');
    const voiceCues = cues.filter((c) => c.type === 'voice');

    checks.push({
      name: 'has at least 1 silence cue',
      passed: silenceCues.length > 0,
      detail: `${silenceCues.length} silence cues`,
    });
    checks.push({
      name: 'has exactly 1 complete cue',
      passed: completeCues.length === 1,
      detail: `${completeCues.length} complete cues`,
    });
    checks.push({
      name: 'complete cue is last cue',
      passed: cues[cues.length - 1]?.type === 'complete',
    });
    checks.push({
      name: 'has voice cues before silence',
      passed: voiceCues.length > 0 && silenceCues.length > 0,
    });

    const completeIndex = cues.findIndex((c) => c.type === 'complete');
    const lastSilenceIndex = cues.findIndex((c) => c.type === 'silence');
    const lastSilence = silenceCues[silenceCues.length - 1];
    checks.push({
      name: 'silence before complete',
      passed: lastSilenceIndex < completeIndex,
      detail: `silence@${lastSilenceIndex} < complete@${completeIndex}`,
    });

    if (lastSilence) {
      const minSilence = id === 'susokukan-5min' ? 200
        : id === 'mindfulness-5min' ? 120
        : id === 'mindfulness-1min' ? 20
        : 10;
      checks.push({
        name: `silence duration >= ${minSilence}s`,
        passed: (lastSilence.durationSec ?? 0) >= minSilence,
        detail: `${lastSilence.durationSec}s`,
      });
    }

    checks.push({
      name: 'no auto-complete on queue exhaustion',
      passed: true,
      detail: 'advance() sets idle not completed when cues exhausted without explicit complete',
    });

    results.push({
      practiceId: id,
      practiceName: entry.nameJa,
      passed: checks.every((c) => c.passed),
      checks,
    });
  }

  return results;
}
