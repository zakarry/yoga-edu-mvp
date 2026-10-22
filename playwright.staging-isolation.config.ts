import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/staging-browser', workers: 1,
  use: { baseURL: 'http://127.0.0.1:4178', trace: 'off', screenshot: 'off', video: 'off',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
  webServer: { command: 'node scripts/staging/serve-site.mjs', url: 'http://127.0.0.1:4178', reuseExistingServer: false },
  outputDir: 'staging-isolation-results', reporter: 'list',
});
