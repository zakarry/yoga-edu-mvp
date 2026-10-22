import { build, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const backend = 'https://htnouayipmqvpckppbzv.supabase.co';
const settings = loadEnv('supabase-staging', process.cwd(), 'VITE_');
if (settings.VITE_SUPABASE_URL !== backend || !settings.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_')) {
  throw new Error('Verified independent staging configuration required');
}
// Explicitly define the whole environment; no production .env or ambient VITE values reach the bundle.
const environment = { MODE: 'isolated-staging', DEV: false, PROD: true, BASE_URL: '/', SSR: false,
  VITE_SUPABASE_URL: backend, VITE_SUPABASE_ANON_KEY: settings.VITE_SUPABASE_ANON_KEY,
  VITE_STAGING_EMAIL_ONLY: 'true', VITE_LINE_LIFF_ID: '', VITE_GOOGLE_MAPS_API_KEY: '',
  VITE_AI_TEACHER_LLM_ENABLED: 'false', VITE_AI_TEACHER_TEST_FUNCTION: '' };
const output = resolve('dist-isolated-staging');
const csp = `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' ${backend}/auth/v1/ ${backend}/rest/v1/ ${backend}/storage/v1/; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; worker-src 'none'`;
await build({ configFile: false, envFile: false, envDir: false, envPrefix: [], plugins: [react()],
  define: Object.fromEntries(Object.entries(environment).map(([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)])),
  build: { outDir: output, sourcemap: false, rollupOptions: { input: resolve('scripts/staging/site.html') } },
});
const htmlPath = resolve(output, 'scripts/staging/site.html');
let html = await readFile(htmlPath, 'utf8');
html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp.replace(/; frame-ancestors 'none'/, '')}">`);
await writeFile(htmlPath, html);
await rename(htmlPath, resolve(output, 'index.html'));
const headers = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
await writeFile(resolve(output, 'vercel.json'), JSON.stringify({ version: 2, framework: null,
  headers: [{ source: '/(.*)', headers }],
}, null, 2));
const manifest = [];
async function audit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.vercel') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { await audit(path); continue; }
    const bytes = await readFile(path);
    const name = relative(output, path).replaceAll('\\', '/');
    if (/\.(?:js|html|json|css)$/.test(name)) {
      const text = bytes.toString('utf8');
      const hosts = [...text.matchAll(/[a-z0-9-]+\.supabase\.co/gi)].map(match => match[0]);
      const privilegedJwt = [...text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)]
        .some(match => { try { return JSON.parse(Buffer.from(match[1], 'base64url')).role === 'service_role'; } catch { return false; } });
      if (hosts.some(host => host !== new URL(backend).hostname) || privilegedJwt || /sb_secret_[A-Za-z0-9_-]{16,}/.test(text)) throw new Error('Unsafe backend or secret in artifact');
    }
    manifest.push({ file: name, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
await audit(output);
const scripts = manifest.filter(entry => entry.file.endsWith('.js'));
const scriptContents = await Promise.all(scripts.map(entry => readFile(resolve(output, entry.file), 'utf8')));
if (!scriptContents.some(text => text.includes(backend) && text.includes(settings.VITE_SUPABASE_ANON_KEY))) {
  throw new Error('Staging backend configuration missing from artifact');
}
await writeFile(resolve(output, 'staging-build.json'), JSON.stringify({ backend, emailOnly: true,
  llm: false, liff: false, edgeDeployed: false, files: manifest }, null, 2));
console.log(`Isolated staging artifact verified: ${manifest.length} files; email only; no Edge deployment`);
