import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// API target overridable for docker (defaults to localhost for native dev).
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3001';

// Polling watcher needed for reliable HMR through docker bind-mounts on WSL2.
const USE_POLLING = process.env.VITE_USE_POLLING === '1';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: USE_POLLING ? { usePolling: true, interval: 200 } : undefined,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
