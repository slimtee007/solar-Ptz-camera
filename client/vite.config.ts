import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // @ts-ignore - allow all hosts for preview proxy
    allowedHosts: true as any,
    hmr: {
      clientPort: 443
    },
    cors: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log(`\n🔴 [VITE PROXY ERROR] ${req.method} ${req.url} -> ${options.target}${req.url}`);
            console.log(`   Error: ${err.message}`);
            console.log(`   FIX: Make sure API server is running: npm run dev --workspace=server (port 3001)\n`);
          });
        }
      },
      '/hls': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
})
