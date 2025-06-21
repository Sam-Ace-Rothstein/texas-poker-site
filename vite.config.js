import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/texas-poker-site/',    // ← add this
  plugins: [react()],
})