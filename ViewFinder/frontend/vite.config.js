import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Required so Vite is accessible outside the Docker container
    port: 5173,
    proxy: {
      // All /api/* requests get forwarded to the backend container
      // e.g. /api/analyze        → http://backend:8000/analyze
      //      /api/static/x.jpg   → http://backend:8000/static/x.jpg
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),  // strip the /api prefix before forwarding
      },
    },
  },
})