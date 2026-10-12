import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { POSE_CATALOG } from '../src/lib/poseCatalog';
import { BREATHWORK_CATALOG } from '../src/lib/breathworkCatalog';
import { MEDITATION_CATALOG } from '../src/lib/meditationCatalog';
import { buildAsanaCues } from '../src/lib/asanaCueBuilder';
import { buildAsanaClockTimeline } from '../src/lib/asanaClockTimeline';
import { buildBreathworkCues } from '../src/lib/breathworkCueBuilder';
import { buildMeditationCues } from '../src/lib/meditationCueBuilder';
import { buildPhasesFromPattern } from '../src/components/BreathworkVisual';
import { getEventDemoPoses, getPoseById } from '../src/lib/poseLibrary';
import { SUSOKUKAN_AUDIO, SUSOKUKAN_INTRO_SEC, SUSOKUKAN_TOTAL_SEC } from '../src/lib/susokukanSession';
import narration from '../src/lib/susokukanNarration.json';
import { SEQUENCE_CATALOG } from '../src/lib/sequenceCatalog';
import { buildSuryaCues, STEP_DURATIONS, type TempoMode } from '../src/lib/suryaCueBuilder';

// Read-only audit of local catalogs. No database, browser, audio playback or asset writes.
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const wavSeconds = (bytes: Buffer) => {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF') return null;
  let rate = 0, size = 0;
  for (let at = 12; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(at + 4), id = bytes.toString('ascii', at, at + 4);
    if (id === 'fmt ' && length >= 16) rate = bytes.readUInt32LE(at + 16);
    if (id === 'data') size += length;
    at += 8 + length + (length % 2);
  }
  return rate ? size / rate : null;
};
const asset = (path: string) => {
  const local = `public${path}`;
  if (!existsSync(local)) return { path, exists: false, sha256: null, durationSec: null };
  const bytes = readFileSync(local);
  return { path, exists: true, sha256: createHash('sha256').update(bytes).digest('hex'), durationSec: wavSeconds(bytes) };
};
// Mirrors the current private resolver solely for auditing; coverage locks it to source.
const audioPath = (key: string) => key === 'susokukan-intro-full' ? SUSOKUKAN_AUDIO
  : `/voice/${key}.${key.startsWith('voice-tree-v2-') ? 'wav' : 'mp3'}`;
const assetsFor = (guide: unknown, images: string[] = []) => {
  const keys = [...new Set([...JSON.stringify(guide).matchAll(/"audioKey":"([^"]+)"/g)].map(m => m[1]))];
  return [...new Set([...keys.map(audioPath), ...images])].filter(Boolean).map(asset);
};

export function collectPracticeOutputs() {
  return [
    ...POSE_CATALOG.map(entry => {
      const clock = ['tadasana', 'catcow'].includes(entry.id);
      const guide = clock ? buildAsanaClockTimeline(entry, entry.defaultDurationMin) : buildAsanaCues(entry, entry.defaultDurationMin);
      return { kind: 'asana', entry, guide, concrete: getPoseById(entry.id), runtime: clock ? 'AsanaClockRuntime' : 'PracticeAudioRuntime',
        timingMode: clock ? 'wall_clock_with_voice_drain' : 'narration_then_hold' };
    }),
    ...BREATHWORK_CATALOG.map(entry => ({ kind: 'breath', entry, guide: buildBreathworkCues(entry),
      phases: entry.pattern ? buildPhasesFromPattern(entry.pattern) : [], concrete: getPoseById(entry.id), runtime: 'PracticeAudioRuntime',
      timingMode: ['box-breathing', 'complete-yoga-breathing'].includes(entry.id) ? 'phase_minimum_and_voice_end' : 'narration_then_silence' })),
    ...MEDITATION_CATALOG.map(entry => ({ kind: 'meditation', entry,
      guide: entry.id === 'susokukan-5min' ? { audio: SUSOKUKAN_AUDIO, narration, introSec: SUSOKUKAN_INTRO_SEC, silenceSec: SUSOKUKAN_TOTAL_SEC - SUSOKUKAN_INTRO_SEC } : buildMeditationCues(entry),
      concrete: getPoseById(entry.id), runtime: entry.id === 'susokukan-5min' ? 'SusokukanSession' : 'PracticeAudioRuntime',
      timingMode: entry.id === 'susokukan-5min' ? 'media_narration_then_silence' : 'legacy_meditation_sequence_with_display_clock' })),
  ];
}

export function collectPracticeInventory() {
  const rows = collectPracticeOutputs().map(row => {
    const entry = row.entry;
    const images = 'image' in entry ? [entry.image ?? '', ...(entry.stageImages ?? []), ...(entry.stages ?? []).map(s => s.image)] : [];
    if ('visual' in entry && entry.visual?.asset) images.push(entry.visual.asset);
    const assets = assetsFor(row.guide, images);
    if (entry.id === 'susokukan-5min') assets.push(asset(SUSOKUKAN_AUDIO));
    const guide = JSON.stringify(row.guide);
    return { practiceId: entry.id, kind: row.kind, nameJa: entry.nameJa, status: entry.status, runtime: row.runtime, timingMode: row.timingMode,
      source: row.kind === 'asana' ? 'src/lib/poseCatalog.ts' : row.kind === 'breath' ? 'src/lib/breathworkCatalog.ts' : 'src/lib/meditationCatalog.ts',
      uiEntry: row.kind === 'asana' ? 'MyAITeacherPage / event-demo (selected IDs only)' : row.kind === 'breath' ? 'MyAITeacherPage / ResultPage' : 'MyAITeacherPage / MeditationExperience',
      outputSha256: sha(row), planned: 'pattern' in entry ? entry.pattern : 'durationSec' in entry ? { durationSec: entry.durationSec } : { minutes: entry.defaultDurationMin, bilateral: 'bilateral' in entry ? entry.bilateral ?? null : null },
      visual: 'visual' in entry ? entry.visual : { images },
      knowledge: { catalog: entry.knowledge, sourceLookup: 'unconfirmed; no database queries', review: 'unconfirmed' },
      safety: { catalog: 'safety' in entry ? entry.safety : 'generalCautions' in entry ? entry.generalCautions : null, independentReview: 'unconfirmed' },
      guideCueCount: Array.isArray(row.guide) ? row.guide.length : narration.length,
      reading: { explicitSpeechText: guide.includes('"speechText"'), containsWrittenExhale: /吐きます|吐いて|吐く/.test(guide), humanPronunciation: 'unconfirmed' },
      assets, assetDurationLimits: 'WAV header duration only; MP3 duration, audible ending, transcript/generation provenance and device listening remain unconfirmed',
      acceptance: entry.id === 'susokukan-5min' ? { galaxyFiveMinuteCompletion: 'PASS (user report 2026-10-12)', fullAudioCaptionSync: 'unconfirmed', pronunciation: 'unconfirmed' } : { device: 'unconfirmed by this inventory' },
      tests: row.kind === 'breath' ? ['test:breathwork', 'test:practice-sessions', 'test:contracts'] : entry.id === 'susokukan-5min' ? ['test:susokukan', 'test:practice-sessions'] : row.kind === 'asana' ? ['test:audio (tree)', 'test:contracts (partial coverage)'] : ['no per-practice lifecycle suite identified'],
    };
  });
  const sequences = SEQUENCE_CATALOG.map(entry => {
    const tempos = Object.keys(STEP_DURATIONS) as TempoMode[];
    const guides = tempos.map(tempo => ({ tempo, cues: buildSuryaCues(entry, tempo) }));
    return { practiceId: entry.id, nameJa: entry.nameJa, status: entry.status, stepCount: entry.steps.length, defaultRounds: entry.defaultRounds,
      runtime: 'SuryaNamaskarExperience / PracticeAudioRuntime', timing: 'voice ended then per-step silence; right/left and tempo preserved',
      steps: entry.steps, tempoHoldSec: STEP_DURATIONS, outputSha256: sha({ entry, guides }),
      assets: assetsFor(guides, entry.steps.flatMap(s => [s.image ?? '', s.imageLeft ?? ''])),
      knowledge: { catalog: entry.knowledge, independentVerification: 'unconfirmed' }, safetyAndDeviceAcceptance: 'unconfirmed by this inventory' };
  });
  return { basis: '05666f44134f5116998dc31d622e0830ef5ed599', scope: 'Local catalogs and effective default outputs only; catalog verified is not independently verified Knowledge or medical safety', rows, sequences,
    summary: Object.fromEntries(['asana', 'breath', 'meditation'].map(kind => [kind, { total: rows.filter(r => r.kind === kind).length, active: rows.filter(r => r.kind === kind && r.status === 'active').length }])),
    missingAssets: [...rows, ...sequences].flatMap(r => r.assets.filter(a => !a.exists).map(a => ({ practiceId: r.practiceId, path: a.path }))),
    preservedExceptions: ['Susokukan dedicated Session overrides legacy catalog 230-second silence and end voice timeline', 'poseLibrary alias 交替鼻呼吸 -> abdominal-breathing remains unaudited', 'Standalone Surya Namaskar 12-step and legacy engines are outside the three catalog counts'],
    eventDemoIds: getEventDemoPoses().map(p => p.id) };
}

if (process.argv.includes('--write')) {
  writeFileSync('docs/practice-core-inventory-20261012.json', JSON.stringify(collectPracticeInventory(), null, 2) + '\n');
}
