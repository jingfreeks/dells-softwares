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
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
})
