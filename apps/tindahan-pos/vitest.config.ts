import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// Mirrors vite.config.ts. Tests render SettingsSidebar, which shows the
// version, and this config does not inherit the app build's `define`.
const { version } = createRequire(import.meta.url)('./package.json')

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/lib/database.types.ts',
        'src/vite-env.d.ts',
      ],
      // Set from the measured numbers, not from an aspiration. Before this
      // they all read 90 and all four were failing -- lines 89.99, statements
      // 87.79, functions 82.28, branches 75.42 -- which nothing noticed
      // because CI ran `vitest run` without --coverage, so the thresholds had
      // never once been evaluated in CI.
      //
      // These sit just under the current values so they act as a ratchet:
      // coverage cannot fall, and raising a number is a deliberate act with a
      // green run behind it. A threshold that is always red teaches everyone
      // to ignore it, which is worse than not having one.
      thresholds: {
        lines: 89,
        statements: 87,
        functions: 82,
        branches: 75,
      },
    },
  },
})
