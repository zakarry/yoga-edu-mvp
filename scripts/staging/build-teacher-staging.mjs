import { loadEnv } from 'vite';
import { spawnSync } from 'node:child_process';
const settings = loadEnv('supabase-staging', process.cwd(), 'VITE_');
if (settings.VITE_SUPABASE_URL !== 'https://htnouayipmqvpckppbzv.supabase.co' || !settings.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_')) throw new Error('Verified staging configuration required');
const env = { ...process.env, ...settings, VITE_LINE_LIFF_ID: '', VITE_GOOGLE_MAPS_API_KEY: '', VITE_AI_TEACHER_LLM_ENABLED: 'false', VITE_AI_TEACHER_TEST_FUNCTION: '' };
for (const args of [['node_modules/typescript/bin/tsc', '-b'], ['node_modules/vite/bin/vite.js', 'build', '--mode', 'supabase-staging', '--outDir', 'dist-supabase-staging']]) {
 const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
 if (result.status !== 0) process.exit(result.status ?? 1);
}
