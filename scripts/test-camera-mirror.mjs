import { build } from 'esbuild';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = mkdtempSync(join(tmpdir(), 'yoga-camera-test-'));
const output = join(directory, 'test.mjs');
try {
  await build({
    entryPoints: [fileURLToPath(new URL('./test-camera-mirror.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'esm', outfile: output,
  });
  await import(pathToFileURL(output).href);
} finally {
  try { unlinkSync(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  rmdirSync(directory);
}

