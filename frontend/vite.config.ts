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

          if (id.includes('react-leaflet') || id.includes('leaflet')) {
            return 'vendor-maps';
          }

          if (id.includes('recharts')) {
            return 'vendor-charts';
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n';
          }

          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('\\react\\') || id.includes('/react/')) {
            return 'vendor-react';
          }

          return 'vendor-misc';
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
