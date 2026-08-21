import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Reuse Vite's own .env loading (same files the app itself reads) so
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are available to test files
// via process.env without a separate dotenv setup. Deliberately only the
// VITE_-prefixed vars — those are already safe to expose (see .env.example)
// — never SUPABASE_SERVICE_ROLE_KEY, which must only ever come from the
// shell/CI secrets, never from a checked-in-adjacent .env file.
const viteEnv = loadEnv('production', process.cwd(), 'VITE_')
for (const [key, value] of Object.entries(viteEnv)) {
  process.env[key] ??= value
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Several specs (feature-flags.spec.ts, and the feature_flags write-
  // protection test in security.spec.ts) toggle rows in the global
  // feature_flags table, which every other test implicitly assumes is
  // absent/enabled-by-default. That's a shared external resource, not
  // per-test state, so running everything serially trades some wall-clock
  // time for eliminating an entire class of cross-test flakiness — worth
  // it for a POS app where a flaky "is checkout math correct" test is
  // worse than a slower CI run.
  workers: 1,
  // CI-only: the shared staging Supabase project has repeatedly shown
  // transient failures under load (rate limiting, a briefly congested
  // runner) that clear up on their own — a real regression fails
  // consistently across retries, a transient one doesn't. Local runs
  // stay at 0 retries so a real bug fails fast instead of hiding behind
  // 3 slow attempts.
  retries: process.env.CI ? 2 : 0,
  // 'list' for readable console output either way; 'html' (never
  // auto-opened) so CI can upload it as an artifact for post-mortem —
  // see .github/workflows/tindahan-pos-ci.yml.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    // Chromium otherwise runs in UTC no matter what the host clock says,
    // while every store this POS serves is in UTC+8. The dashboard decides
    // what "today" means by comparing local calendar dates, so for the eight
    // hours a day where the UTC date and the Manila date disagree, a sale the
    // test just rang up stops counting as today's — the checkout spec failed
    // three times running at 23:59 UTC and passed at 00:02 with no code
    // change. Production browsers sit in Manila and never see the split;
    // pinning it here makes the suite match production instead of drifting
    // with the wall clock.
    timezoneId: 'Asia/Manila',
    locale: 'en-PH',
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
