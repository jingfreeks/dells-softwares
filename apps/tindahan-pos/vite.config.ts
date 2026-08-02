import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * Mirrors the "/" -> "/landing.html" rewrite in vercel.json so the
 * marketing page shows up at the site root in local dev/preview too,
 * not just in production. Every other path (e.g. /login, /pos) is
 * untouched and still serves the SPA.
 */
function serveLandingAtRoot(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    if (req.url === '/') req.url = '/landing.html'
    next()
  }
  return {
    name: 'serve-landing-at-root',
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveLandingAtRoot()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: [root],
    },
  },
})
