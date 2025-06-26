import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // add your two HTML entry‐points here:
      input: {
        main: resolve(__dirname, 'index.html'),
        account: resolve(__dirname, 'public/account.html'),
      }
    }
  }
})