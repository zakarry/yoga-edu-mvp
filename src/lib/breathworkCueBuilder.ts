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
    if (round === 0) {
      const label = phaseKey === 'inhale' ? '吸う' : phaseKey === 'exhale' ? '吐く' : '止める';
      const text = vg.phaseCues?.[label] ?? '';
      const key = vg.phaseAudioKeys?.[phaseKey] ?? vg.phaseAudioKeys?.[label];
      return text ? [{ text, audioKey: key }] : [];
    }
    if (phaseKey === 'inhale') return [{ text: '吸います。', audioKey: 'voice-inhale' }];
    if (phaseKey === 'exhale') return [{ text: '鼻から吐きます。', audioKey: 'voice-box-exhale' }];
    return [{ text: '止めます。', audioKey: 'voice-hold' }];
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

  if (entry.id === 'abdominal-breathing') {
    if (phaseKey === 'inhale') {
      if (round === 0) {
        return [
          { text: '苦しくなければ、鼻からゆっくり吸います。', audioKey: 'voice-abdominal-intro-2' },
          { text: 'お腹がやさしく広がる感覚を感じます。', audioKey: 'voice-abdominal-intro-3' },
        ];
      }
      if (round === 1) {
        return [
          { text: 'もう一度、鼻からゆっくり吸います。', audioKey: 'voice-abdominal-r3' },
          { text: 'お腹の広がりを感じましょう。', audioKey: 'voice-abdominal-r4' },
        ];
      }
      return [{ text: '鼻からゆっくり吸います。', audioKey: 'voice-abdominal-r1' }];
    }
    if (phaseKey === 'exhale') {
      if (round === 0) {
        return [
          { text: '鼻からゆっくり吐いて、お腹がやさしく戻ります。', audioKey: 'voice-abdominal-intro-4' },
        ];
      }
      return [
        { text: '鼻からゆっくり吐いて、力を抜きます。', audioKey: 'voice-abdominal-r2' },
      ];
    }
    return [];
  }

  if (entry.id === 'thoracic-breathing') {
    if (phaseKey === 'inhale') {
      if (round === 0) {
        return [
          { text: '苦しくなければ、鼻からゆっくり吸います。', audioKey: 'voice-thoracic-intro-2' },
          { text: '胸郭が前後左右にやさしく広がる感覚を感じます。', audioKey: 'voice-thoracic-intro-3' },
        ];
      }
      if (round === 1) {
        return [
          { text: 'もう一度、鼻からゆっくり吸います。', audioKey: 'voice-thoracic-r1' },
          { text: '胸の広がりを感じましょう。', audioKey: 'voice-thoracic-r4' },
        ];
      }
      return [{ text: '鼻からゆっくり吸います。', audioKey: 'voice-thoracic-r1' }];
    }
    if (phaseKey === 'exhale') {
      if (round === 0) {
        return [
          { text: '鼻からゆっくり吐いて、胸郭が自然に戻るのを感じます。', audioKey: 'voice-thoracic-intro-4' },
        ];
      }
      return [
        { text: '鼻からゆっくり吐いて、力を抜きます。', audioKey: 'voice-thoracic-r2' },
      ];
    }
    return [];
  }

  // Generic fallback for other breathwork (nadi, complete-yoga-breathing, etc.)
  if (phaseKey === 'inhale') {
    return [
      { text: '鼻からゆっくり吸います。', audioKey: 'voice-box-inhale' },
    ];
  }
  if (phaseKey === 'exhale') {
    return [
      { text: '鼻からゆっくり吐きます。', audioKey: 'voice-box-exhale' },
    ];
  }
  return [];
}

function getIntroCues(entry: BreathworkCatalogEntry): { text: string; audioKey?: string }[] {
  if (entry.id === 'box-breathing' || entry.id === 'brahmari') return entry.voiceGuide.intro;
  // For abdominal/thoracic, only use the first intro cue as the opening line;
  // the detailed instructions are embedded in round 0 phase cues.
  if (entry.id === 'abdominal-breathing' || entry.id === 'thoracic-breathing') {
    return entry.voiceGuide.intro.slice(0, 1);
  }
  return entry.voiceGuide.intro;
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
    if (entry.id === 'nadi-shodhana') {
      add({ type: 'silence', durationSec: 1.5 });
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
