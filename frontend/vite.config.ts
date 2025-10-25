import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Placeholder configuration. Replace aliases/endpoints once the PWA is implemented.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});
