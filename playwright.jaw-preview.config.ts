import { defineConfig } from '@playwright/test';

const origin = 'http://127.0.0.1:' + (process.env.JAW_PREVIEW_PORT || '4182');

export default defineConfig({
  testDir: './tests/jaw-preview',
  use: {
    baseURL: origin,
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port ' + new URL(origin).port + ' --strictPort',
    url: origin + '/jaw-release.html',
  },
});
