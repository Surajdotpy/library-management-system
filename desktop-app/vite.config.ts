import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  base: './',  // ← ADDED: Important for Electron to load files correctly
  
  // Path alias configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Server configuration
  server: {
    port: 3000,  // Changed from 5173 to 3000 to match your setup
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  
  // Build configuration for Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})