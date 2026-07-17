import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Full paths, not `npm run`: this folder's name contains a literal colon,
    // which is the POSIX PATH separator — anything that resolves binaries via
    // PATH (like `npm run`, which prepends node_modules/.bin) breaks here.
    command:
      '../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build && ../../node_modules/.bin/vite preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
