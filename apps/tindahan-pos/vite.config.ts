import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = fileURLToPath(new URL('.', import.meta.url))

// Read from package.json at build time so the number shown in the app and the
// number the repository declares cannot drift apart. BIR accreditation expects
// the running software to be identifiable; a version nobody can read off the
// device does not achieve that.
const { version } = createRequire(import.meta.url)('./package.json')

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    strictPort:true,
    fs: {
      allow: [root],
    },
  },
})
