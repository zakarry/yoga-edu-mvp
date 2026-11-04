import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/jaw-preview',
  use: {
    baseURL: 'http://127.0.0.1:4182',
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4182 --strictPort',
    url: 'http://127.0.0.1:4182/jaw-release.html',
  },
});
