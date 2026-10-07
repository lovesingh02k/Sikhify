import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The backend API (backend/src/index.js) listens on :8787; the dev and preview
// servers forward /api and /uploads to it, so the browser always talks to one origin.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'SIKHIFY_'), ...process.env };
  const API = env.SIKHIFY_API_PROXY || 'http://127.0.0.1:8787';
  const proxy = {
    '/api': { target: API, changeOrigin: false },
    '/uploads': { target: API, changeOrigin: false },
  };
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  };
});
