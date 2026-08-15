import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**'],
    // supabaseClient.ts throws at import if these are missing, by design --
    // a missing key should fail loudly rather than silently build a broken
    // client. Tests never reach the network, so placeholders are enough.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
