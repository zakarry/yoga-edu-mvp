import { spawnSync } from 'node:child_process';
// A separate local-only artifact. Never reuse production/backend credentials.
const env = { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:54329', VITE_SUPABASE_ANON_KEY: 'local-fixture-only',
  VITE_LINE_LIFF_ID: '', VITE_GOOGLE_MAPS_API_KEY: '', VITE_AI_TEACHER_LLM_ENABLED: 'false', VITE_AI_TEACHER_TEST_FUNCTION: '' };
for (const args of [['node_modules/typescript/bin/tsc','-b'], ['node_modules/vite/bin/vite.js','build','--outDir','dist-settings-test']]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
