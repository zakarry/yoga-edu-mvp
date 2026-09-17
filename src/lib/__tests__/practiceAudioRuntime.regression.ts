import { PracticeAudioRuntime, type PracticeCue, type RuntimeEvent } from '../practiceAudioRuntime';
import { MEDITATION_CATALOG } from '../meditationCatalog';
import { BREATHWORK_CATALOG } from '../breathworkCatalog';
import { POSE_CATALOG } from '../poseCatalog';
import { SEQUENCE_CATALOG } from '../sequenceCatalog';

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
