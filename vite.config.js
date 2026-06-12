import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api requests to the Express server during development so the browser
    // never has to deal with cross-origin requests or hardcoded ports.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
