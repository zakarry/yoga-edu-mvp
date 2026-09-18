import type { BreathworkCatalogEntry } from './breathworkCatalog';
import type { PracticeCue } from './practiceAudioRuntime';
import { buildPhasesFromPattern, type BreathPhase } from '../components/BreathworkVisual';

function phaseCuesForRound(
  entry: BreathworkCatalogEntry,
  phaseKey: string,
  round: number,
): { text: string; audioKey?: string }[] {
  const vg = entry.voiceGuide;
  if (entry.id === 'box-breathing') {
    const label = phaseKey === 'inhale' ? '吸う' : phaseKey === 'exhale' ? '吐く' : '止める';
    if (round > 0 && phaseKey !== 'exhale') {
      return [{ text: phaseKey === 'inhale' ? '吸います。' : '止めます。', audioKey: phaseKey === 'inhale' ? 'voice-inhale' : 'voice-hold' }];
    }
    const text = vg.phaseCues?.[label] ?? '';
    const key = vg.phaseAudioKeys?.[phaseKey] ?? vg.phaseAudioKeys?.[label];
    return text ? [{ text, audioKey: key }] : [];
  }
  if (entry.id === 'brahmari') {
    const rc = vg.repeatCues ?? [];
    if (round > 0 && rc.length >= 2) {
      if (phaseKey === 'inhale') return [{ text: rc[0].text, audioKey: rc[0].audioKey }];
      if (phaseKey === 'exhale') return [{ text: rc[1].text, audioKey: rc[1].audioKey }];
    }
    const cueText = vg.phaseCues?.[phaseKey === 'inhale' ? '吸う' : '吐く'] ?? '';
    return cueText ? [{ text: cueText }] : [];
  }
  const prefix = entry.id === 'abdominal-breathing' ? 'abdominal' : 'thoracic';
  if (phaseKey === 'inhale') {
    return [
      { text: '鼻からゆっくり吸います。', audioKey: 'voice-box-inhale' },
      { text: entry.id === 'abdominal-breathing' ? 'お腹の広がりを感じましょう。' : '胸の広がりを感じましょう。', audioKey: `voice-${prefix}-r4` },
    ];
  }
  if (phaseKey === 'exhale') {
    return [
      { text: '鼻からゆっくり吐きます。', audioKey: 'voice-box-exhale' },
      { text: '肩の力を抜きましょう。', audioKey: 'voice-relax-shoulders' },
    ];
  }
  return [];
}

function getIntroCues(entry: BreathworkCatalogEntry): { text: string; audioKey?: string }[] {
  if (entry.id === 'box-breathing' || entry.id === 'brahmari') return entry.voiceGuide.intro;
  return entry.voiceGuide.intro.slice(0, 1);
}

export function buildBreathworkCues(entry: BreathworkCatalogEntry): PracticeCue[] {
  const cues: PracticeCue[] = [];
  const pattern = entry.pattern;
  if (!pattern) return cues;

  const phases = buildPhasesFromPattern(pattern);
  const totalRounds = pattern.rounds;
  const vg = entry.voiceGuide;
  const isSequence = ['box-breathing', 'abdominal-breathing', 'thoracic-breathing', 'brahmari'].includes(entry.id);

  let idx = 0;
  const add = (cue: Omit<PracticeCue, 'id'>) => {
    cues.push({ ...cue, id: `bw-${entry.id}-${idx++}` });
  };

  if (isSequence) {
    const intro = getIntroCues(entry);
    for (const c of intro) {
      add({ type: 'voice', displayText: c.text, speechText: c.text, audioKey: c.audioKey });
    }
    const finalCue = vg.completion[0]
      ? { text: vg.completion[0].text, audioKey: vg.completion[0].audioKey }
      : { text: '最後の呼吸です。', audioKey: 'voice-box-final' };
    const ending = vg.completion[1]
      ? { text: vg.completion[1].text, audioKey: vg.completion[1].audioKey }
      : { text: '自然な呼吸に戻りましょう。', audioKey: 'voice-abdominal-end-2' };

    for (let round = 0; round < totalRounds; round++) {
      if (round === totalRounds - 1) {
        add({ type: 'voice', displayText: finalCue.text, speechText: finalCue.text, audioKey: finalCue.audioKey });
      }
      for (const phase of phases) {
        const phaseCues = phaseCuesForRound(entry, phase.key, round);
        for (const c of phaseCues) {
          add({ type: 'voice', displayText: c.text, speechText: c.text, audioKey: c.audioKey });
        }
        add({ type: 'silence', durationSec: phase.seconds });
      }
    }
    add({ type: 'voice', displayText: ending.text, speechText: ending.text, audioKey: ending.audioKey });
    add({ type: 'complete', displayText: 'お疲れさまでした。', isFinalCue: true });
  } else {
    for (const c of vg.intro) {
      add({ type: 'voice', displayText: c.text, speechText: c.text, audioKey: c.audioKey });
    }
    const repeatCues = vg.repeatCues ?? [];
    const phaseCues = vg.phaseCues ?? {};
    const phaseAudioKeys = vg.phaseAudioKeys ?? {};

    for (let round = 0; round < totalRounds; round++) {
      for (const phase of phases) {
        const cueText = phaseCues[phase.label] ?? phaseCues[phase.key] ?? '';
        const cueAudioKey = phaseAudioKeys[phase.label] ?? phaseAudioKeys[phase.key];
        if (cueText) {
          add({ type: 'voice', displayText: cueText, speechText: cueText, audioKey: cueAudioKey });
        }
        add({ type: 'silence', durationSec: phase.seconds });
      }
      if (round > 0 && repeatCues.length > 0) {
        for (const c of repeatCues) {
          add({ type: 'voice', displayText: c.text, speechText: c.text, audioKey: c.audioKey });
        }
      }
    }
    for (const c of vg.completion) {
      add({ type: 'voice', displayText: c.text, speechText: c.text, audioKey: c.audioKey });
    }
    add({ type: 'complete', displayText: 'お疲れさまでした。', isFinalCue: true });
  }

  return cues;
}
