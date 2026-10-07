import { writeFileSync } from 'node:fs';
import { POSE_CATALOG, getCatalogEntry } from '../src/lib/poseCatalog';
import { BREATHWORK_CATALOG } from '../src/lib/breathworkCatalog';
import { MEDITATION_CATALOG } from '../src/lib/meditationCatalog';
import { buildAsanaCues } from '../src/lib/asanaCueBuilder';
const voices = Object.fromEntries(buildAsanaCues(getCatalogEntry('vrksasana')!, 1).filter(c => c.audioKey).map(c => [c.audioKey!, c.speechText]));
writeFileSync('public/voice/tree-v2-transcripts.json', JSON.stringify(voices, null, 2) + '\n');
console.log(JSON.stringify({
  asana: POSE_CATALOG.filter(p => p.type === 'asana').length,
  catalog: POSE_CATALOG.length,
  breath: BREATHWORK_CATALOG.length,
  meditation: MEDITATION_CATALOG.length,
  active: { asana: POSE_CATALOG.filter(p => p.type === 'asana' && p.status === 'active').length, breath: BREATHWORK_CATALOG.filter(p => p.status === 'active').length, meditation: MEDITATION_CATALOG.filter(p => p.status === 'active').length },
  treeAudioFiles: Object.keys(voices).length,
}, null, 2));
