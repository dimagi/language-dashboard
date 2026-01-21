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
        // Copy 404.html to dist (with redirect script for GitHub Pages SPA routing)
        // The 404.html contains a script that redirects to index.html with the path
        // encoded in the query string, which is then restored by the script in index.html
        copyFileSync(
          join(__dirname, 'public/404.html'),
          join(__dirname, 'dist/404.html')
        )
        console.log('✅ CNAME and 404.html copied to dist')
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
