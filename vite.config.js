import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-cname',
      closeBundle() {
        // Copy CNAME to dist after build
        copyFileSync(
          join(__dirname, 'public/CNAME'),
          join(__dirname, 'dist/CNAME')
        )
      }
    }
  ],
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
