import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/texas-poker-site/',
  plugins: [react()],
  server: {
    proxy: {
      // Redirect any /api/* requests to your local API server
      '/api': 'http://localhost:3001'
    }
  }
})