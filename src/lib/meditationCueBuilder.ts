import type { MeditationCatalogEntry, MeditationTimelineEvent } from './meditationCatalog';
import type { PracticeCue } from './practiceAudioRuntime';

export function buildMeditationCues(entry: MeditationCatalogEntry): PracticeCue[] {
  const sorted = [...entry.timeline].sort((a, b) => a.atSec - b.atSec);
  const cues: PracticeCue[] = [];
  let idx = 0;

  for (const event of sorted) {
    const id = `med-${entry.id}-${idx++}`;
    if (event.type === 'voice') {
      cues.push({
        id,
        type: 'voice',
        displayText: event.text,
        speechText: event.audioText ?? event.text,
        audioKey: event.audioKey,
      });
    } else if (event.type === 'silence') {
      cues.push({
        id,
        type: 'silence',
        durationSec: event.durationSec ?? 30,
        displayText: event.text,
      });
    } else if (event.type === 'complete') {
      cues.push({
        id,
        type: 'complete',
        displayText: event.text,
        isFinalCue: true,
      });
    }
  }

  return cues;
}

export function getMeditationAudioKeys(entry: MeditationCatalogEntry): string[] {
  return entry.timeline
    .filter((e): e is MeditationTimelineEvent & { audioKey: string } => e.type === 'voice' && !!e.audioKey)
    .map((e) => e.audioKey);
}
