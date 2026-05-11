import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Only proxy XHR/fetch API calls — let browser page navigations
        // fall through to the React SPA (index.html).
        bypass(req) {
          const accept = req.headers.accept || '';
          if (accept.includes('text/html')) return '/index.html';
        },
      },
      '/files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          const accept = req.headers.accept || '';
          if (accept.includes('text/html')) return '/index.html';
        },
      },
    },
  },
})
