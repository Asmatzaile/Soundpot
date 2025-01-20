import { defineConfig } from 'vite'
import config from '../config.json'
import react from '@vitejs/plugin-react'

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
  }
})
