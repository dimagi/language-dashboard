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
        // Copy the BUILT index.html to 404.html (so it has correct asset references)
        // This ensures 404.html loads the React app correctly in production
        copyFileSync(
          join(__dirname, 'dist/index.html'),
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
