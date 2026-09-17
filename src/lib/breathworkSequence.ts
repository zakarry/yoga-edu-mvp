import type { BreathworkCatalogEntry } from './breathworkCatalog';
import type { VoiceCueDef } from './poseCatalog';

// Only these practices opt into completion-driven cues. Complete yoga breathing
// keeps its existing audio timeline.
export const usesBreathworkSequence = (id: string) =>
  ['box-breathing', 'abdominal-breathing', 'thoracic-breathing', 'brahmari'].includes(id);

export function getBreathworkPhaseSequence(entry: BreathworkCatalogEntry, phase: string, round: number): VoiceCueDef[] {
  const vg = entry.voiceGuide;
  if (entry.id === 'box-breathing') {
    const label = phase === 'inhale' ? '吸う' : phase === 'exhale' ? '吐く' : '止める';
    if (round > 0 && phase !== 'exhale') {
      return [{ at: 0, text: phase === 'inhale' ? '吸います。' : '止めます。', audioKey: phase === 'inhale' ? 'voice-inhale' : 'voice-hold' }];
    }
    const text = vg.phaseCues?.[label] ?? '';
    const key = vg.phaseAudioKeys?.[phase] ?? vg.phaseAudioKeys?.[label];
    return text ? [{ at: 0, text, audioKey: key }] : [];
  }
  if (entry.id === 'brahmari') {
    const rc = entry.voiceGuide.repeatCues ?? [];
    if (round > 0 && rc.length >= 2) {
      if (phase === 'inhale') {
        return [{ at: 0, text: rc[0].text, audioKey: rc[0].audioKey }];
      }
      if (phase === 'exhale') {
        return [{ at: 0, text: rc[1].text, audioKey: rc[1].audioKey }];
      }
    }
    const cueText = entry.voiceGuide.phaseCues?.[phase === 'inhale' ? '吸う' : '吐く'] ?? '';
    return cueText ? [{ at: 0, text: cueText }] : [];
  }
  const prefix = entry.id === 'abdominal-breathing' ? 'abdominal' : 'thoracic';
  if (phase === 'inhale') {
    return [
      { at: 0, text: '鼻からゆっくり吸います。', audioKey: 'voice-box-inhale' },
      { at: 0, text: entry.id === 'abdominal-breathing' ? 'お腹の広がりを感じましょう。' : '胸の広がりを感じましょう。', audioKey: `voice-${prefix}-r4` },
    ];
  }
  if (phase === 'exhale') {
    return [
      { at: 0, text: '鼻からゆっくり吐きます。', audioKey: 'voice-box-exhale' },
      { at: 0, text: '肩の力を抜きましょう。', audioKey: 'voice-relax-shoulders' },
    ];
  }
  return [];
}

export function getBreathworkIntro(entry: BreathworkCatalogEntry): VoiceCueDef[] {
  // The remaining body intro instructions are now spoken in their own phases,
  // on every round, rather than before an unrelated timer starts.
  if (entry.id === 'box-breathing') return entry.voiceGuide.intro;
  if (entry.id === 'brahmari') return entry.voiceGuide.intro;
  return entry.voiceGuide.intro.slice(0, 1);
}

export function waitForBreathwork(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });
}
