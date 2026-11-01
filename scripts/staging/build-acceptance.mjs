import { build, loadEnv } from 'vite';
import { resolve } from 'node:path';
const settings = loadEnv('supabase-staging', process.cwd(), 'VITE_');
if (settings.VITE_SUPABASE_URL !== 'https://htnouayipmqvpckppbzv.supabase.co' || !settings.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_')) throw new Error('Verified independent staging configuration required');
await build({ configFile: false, mode: 'supabase-staging', build: { outDir: 'dist-teacher-acceptance', rollupOptions: { input: resolve('scripts/staging/acceptance.html') } } });
