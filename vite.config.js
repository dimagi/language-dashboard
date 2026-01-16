import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // GitHub Pages with custom domain
  build: {
    outDir: 'dist'
  },
  server: {
    fs: {
      strict: false, // Allow serving files from outside the workspace root
    },
  },
})
