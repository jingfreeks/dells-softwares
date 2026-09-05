import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Unit tests must not need a real project. The POS's CI injects the live
    // URL and anon key as secrets because its tests grew up alongside a local
    // .env; nothing here should require either, so the client gets values that
    // are obviously not a project. No test makes a network call.
    env: {
      VITE_SUPABASE_URL: 'http://accounting.test.invalid',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-not-a-real-key',
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
})
