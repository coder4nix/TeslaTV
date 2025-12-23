import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://144.76.200.209',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          // Log proxy requests for debugging
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying:', req.method, req.url, '→', proxyReq.path);
          });
        }
      },
      '/images': {
        target: 'http://144.76.200.209',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Log image proxy requests for debugging
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying Image:', req.method, req.url, '→', proxyReq.path);
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
