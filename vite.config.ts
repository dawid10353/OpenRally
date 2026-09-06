import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    allowedHosts: true,
    watch: {
      usePolling: true, // Fix for WSL watching files on /mnt/c/
    }
  },
  preview: {
    host: true,
    allowedHosts: true,
  }
})
