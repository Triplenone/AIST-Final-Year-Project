import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Same-origin static deploy: drop crossorigin on scripts to avoid stale CORS/cache issues. */
function stripCrossoriginAttribute(): Plugin {
  return {
    name: 'strip-crossorigin-attribute',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin/g, '');
    }
  };
}

export default defineConfig({
  plugins: [react(), stripCrossoriginAttribute()],
  build: {
    rollupOptions: {
      output: {
        // Only split heavy map/chart libs (lazy routes). Keep one vendor chunk so React
        // hooks are never read from a separate chunk with an undefined React binding.
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          const moduleId = id.replace(/\\/g, '/');
          if (moduleId.includes('/leaflet/') || moduleId.includes('/react-leaflet/')) {
            return 'vendor-maps';
          }
          if (moduleId.includes('/recharts/') || moduleId.includes('/d3-')) {
            return 'vendor-charts';
          }
          return 'vendor';
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
