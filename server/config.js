/* ==========================================================================
   Sikhify API — config.js
   All configuration comes from environment variables (see .env.example).
   No secrets are stored in the repository.
   ========================================================================== */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

/** Loads KEY=value lines from .env (if present) without overriding real env vars. */
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

export function loadConfig(overrides = {}) {
  loadDotEnv();
  const env = process.env;
  const production = (overrides.nodeEnv || env.NODE_ENV) === 'production';
  const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes)$/i.test(v));
  return {
    production,
    port: Number(env.PORT || 8787),
    host: env.HOST || (production ? '0.0.0.0' : '127.0.0.1'),
    dbPath: path.resolve(ROOT, env.SIKHIFY_DB_PATH || 'server/data/sikhify.db'),
    databaseUrl: env.SIKHIFY_DATABASE_URL || '',
    databaseAuthToken: env.SIKHIFY_DATABASE_AUTH_TOKEN || '',
    uploadDir: path.resolve(ROOT, env.SIKHIFY_UPLOAD_DIR || 'server/uploads'),
    distDir: path.resolve(ROOT, 'dist'),
    publicUrl: (env.SIKHIFY_PUBLIC_URL || (production
      ? (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '')
      : 'http://localhost:5173')).replace(/\/$/, ''),
    cookieSecure: bool(env.SIKHIFY_COOKIE_SECURE, production),
    trustProxy: bool(env.SIKHIFY_TRUST_PROXY, false),
    sessionDays: Number(env.SIKHIFY_SESSION_DAYS || 30),
    resendApiKey: env.RESEND_API_KEY || '',
    mailFrom: env.MAIL_FROM || '',
    serveStatic: bool(env.SIKHIFY_SERVE_STATIC, production),
    // Logs each Gurdwara Directory query (filters + result counts; never credentials). On in development.
    debugQueries: bool(env.SIKHIFY_DEBUG_QUERIES, !production && !env.NODE_TEST_CONTEXT),
    ...overrides,
  };
}
