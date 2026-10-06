/* ==========================================================================
   Sikhify API — server entry
   Development:  npm run dev        (Vite on :5173 proxies /api → this server on :8787)
   Production:   npm run build && npm start   (serves dist/ and /api from one process)
   ========================================================================== */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';
import { openDatabaseForConfig } from './db/database.js';
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
  await new Promise((resolve) => server.listen(config.port, config.host, resolve));
  const addr = server.address();
  return { server, db, config, url: `http://${addr.address === '::' ? 'localhost' : addr.address}:${addr.port}` };
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startServer().then(({ url, config }) => {
    console.info(`[sikhify] API listening on ${url}${config.serveStatic ? ' (serving dist/)' : ''}`);
    console.info(`[sikhify] database: ${config.dbPath}`);
    if (!config.production) console.info('[sikhify] Create the first Master Admin with: npm run admin:create -- --email you@example.com --name "Your Name" --username you');
  }).catch((err) => {
    console.error('[sikhify] failed to start', err);
    process.exit(1);
  });
}
