// app.config.ts
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({
  server: {
    preset: 'node-server', // ← change this from 'cloudflare-pages' or auto-detected
  },
})
