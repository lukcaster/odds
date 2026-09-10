import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend (React) żyje w web/. Build ląduje w dist-web/, który backend
// serwuje w produkcji. W devie: `npm run web:dev` (proxy /api → :3000).
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
