import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // Base public path when served (GitHub Pages at /texas-poker-site/)
  base: '/texas-poker-site/',

  // Ensure static assets in `public/` are copied as-is
  publicDir: 'public',

  plugins: [react()],

  server: {
    proxy: {
      // Redirect /api calls to your local backend
      '/api': 'http://localhost:3001'
    }
  },

  build: {
    outDir: 'dist',
    rollupOptions: {
      // Include additional HTML entry points for account and sidebar
      input: {
        main: resolve(__dirname, 'index.html'),
        account: resolve(__dirname, 'public/account.html'),
        sidebar: resolve(__dirname, 'public/left-sidebar.html')
      }
    }
  }
});