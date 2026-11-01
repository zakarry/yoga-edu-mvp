import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/teacher-browser', workers: 1, retries: 0, timeout: 90_000,
  expect: { timeout: 15_000 }, reporter: [['list'], ['html', { outputFolder: 'teacher-settings-report', open: 'never' }]],
  outputDir: 'teacher-settings-results',
  use: { baseURL: 'http://127.0.0.1:4175', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
  webServer: { command: 'node scripts/build-teacher-settings-test.mjs && node node_modules/vite/bin/vite.js preview --outDir dist-settings-test --host 127.0.0.1 --port 4175', url: 'http://127.0.0.1:4175', reuseExistingServer: false, timeout: 120_000 },
});
