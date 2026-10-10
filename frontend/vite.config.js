import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { SITE_SECURITY_HEADERS } from '../shared/securityHeaders.js';

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
    // `vite preview` serves the built site with the same security headers as production (vercel.json).
    // (Not the dev server: Vite's dev client relies on inline scripts and a websocket.)
    preview: { proxy, headers: SITE_SECURITY_HEADERS },
  };
});
