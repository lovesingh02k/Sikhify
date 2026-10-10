/* ==========================================================================
   Sikhify API — server entry
   Development:  npm run dev        (Vite on :5173 proxies /api → this server on :8787)
   Production:   npm run build && npm start   (serves frontend/dist/ and /api from one process)
   ========================================================================== */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';
import { openDatabaseForConfig, describeDatabase, schemaVersion } from './db/database.js';
import { seedMediaIfEmpty } from './db/seedMedia.js';
import { createMailer } from './lib/mailer.js';
import { createApp } from './app.js';

export async function startServer(overrides = {}) {
  const config = loadConfig(overrides);
  const log = overrides.log || console;
  const db = await openDatabaseForConfig(config);
  await seedMediaIfEmpty(db, (m) => log.info('[db] ' + m));
  const mailer = createMailer(config, log);
  const handler = createApp({ db, config, mailer, log });
  const server = http.createServer(handler);
  server.headersTimeout = 20000;
  server.requestTimeout = 30000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => { server.off('error', reject); resolve(); });
  });
  const addr = server.address();
  return { server, db, config, url: `http://${addr.address === '::' ? 'localhost' : addr.address}:${addr.port}` };
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startServer().then(({ url, config, db }) => {
    const target = describeDatabase(config);
    console.info(`[sikhify] API listening on ${url}${config.serveStatic ? ' (serving frontend/dist/)' : ''}`);
    console.info(`[sikhify] database: ${target.provider}`);
    console.info(`[sikhify] database ${target.remote ? 'host' : 'file'}: ${target.remote ? target.host : target.path}`);
    console.info(`[sikhify] schema version: ${schemaVersion(db)}`);
    if (config.production && !config.publicUrl) console.warn('[sikhify] SIKHIFY_PUBLIC_URL is not set: password-reset links cannot be built. Set it in the server environment (e.g. https://sikhify.in).');
    if (target.remote && !config.production) console.info('[sikhify] note: SIKHIFY_DATABASE_URL is set (backend/.env), so this development server uses the remote database, not backend/data/sikhify.db');
    if (!config.production) console.info('[sikhify] Create the first Master Admin with: npm run admin:create -- --email you@example.com --name "Your Name" --username you');
  }).catch((err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`[sikhify] port ${err.port} is already in use — another Sikhify API (or another program) is running there.`);
      console.error('[sikhify] Stop it (close its terminal, or: Get-NetTCPConnection -LocalPort ' + err.port + ' | Select OwningProcess) or start with PORT=<other port>.');
    } else console.error('[sikhify] failed to start', err);
    process.exit(1);
  });
}
