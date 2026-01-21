import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-cname-and-404',
      closeBundle() {
        // Copy CNAME to dist after build
        copyFileSync(
          join(__dirname, 'public/CNAME'),
          join(__dirname, 'dist/CNAME')
        )
        // Copy 404.html to dist after build (for GitHub Pages routing)
        copyFileSync(
          join(__dirname, 'public/404.html'),
          join(__dirname, 'dist/404.html')
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
