import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Placeholder configuration. Replace aliases/endpoints once the PWA is implemented.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          return 'vendor';
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.trycloudflare.com', 'smartcare2026.com', 'www.smartcare2026.com'],
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/sim': 'http://127.0.0.1:8000'
    }
  }
});
