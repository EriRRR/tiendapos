import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',  // ← CRÍTICO para Electron — rutas relativas
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})