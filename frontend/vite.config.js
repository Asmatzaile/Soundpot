import { defineConfig } from 'vite'
import config from '../config.json'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: "http://localhost:" + config.backend_port,
        rewrite: (path) => path.replace('/api','')
      }
    }
  },
  resolve: {
    alias: {
      '@context': path.resolve(__dirname, 'src/context'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    }
  }
})
