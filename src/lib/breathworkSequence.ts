import type { BreathworkCatalogEntry } from './breathworkCatalog';
import type { VoiceCueDef } from './poseCatalog';

// Only these practices opt into completion-driven cues. Complete yoga breathing
// keeps its existing audio timeline.
export const usesBreathworkSequence = (id: string) =>
  ['box-breathing', 'abdominal-breathing', 'thoracic-breathing'].includes(id);

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
  return entry.id === 'box-breathing' ? entry.voiceGuide.intro : entry.voiceGuide.intro.slice(0, 1);
}

export function waitForBreathwork(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });
}
