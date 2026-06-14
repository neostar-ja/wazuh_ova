import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/wazuh/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/wazuh/api': { target: 'http://wazuhweb_backend:8000', changeOrigin: true },
      '/wazuh/ws': { target: 'ws://wazuhweb_backend:8000', ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
})
