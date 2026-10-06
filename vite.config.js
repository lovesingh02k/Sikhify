import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API server (server/index.js) listens on :8787; the dev and preview servers
// forward /api and /uploads to it, so the browser always talks to one origin.
const API = process.env.SIKHIFY_API_PROXY || 'http://127.0.0.1:8787';
const proxy = {
  '/api': { target: API, changeOrigin: false },
  '/uploads': { target: API, changeOrigin: false },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
