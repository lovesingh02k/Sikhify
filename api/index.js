/* Sikhify — Vercel API entrypoint
 *
 * The existing Express-like Node handler is kept intact. Vercel invokes this
 * file as a Node.js Function; the singleton below reuses the database/app
 * while a function instance stays warm.
 */
import { loadConfig } from '../server/config.js';
import { openDatabaseForConfig } from '../server/db/database.js';
import { seedMediaIfEmpty } from '../server/db/seedMedia.js';
import { createMailer } from '../server/lib/mailer.js';
import { createApp } from '../server/app.js';

let runtimePromise;

async function runtime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const config = loadConfig({ nodeEnv: 'production', serveStatic: false });
      if (!config.databaseUrl) {
        throw new Error('SIKHIFY_DATABASE_URL is not configured. Connect the Vercel project to a Turso/libSQL database first.');
      }
      if (!config.databaseAuthToken) {
        throw new Error('SIKHIFY_DATABASE_AUTH_TOKEN is not configured. Add the Turso database token in Vercel Environment Variables.');
      }
      const db = await openDatabaseForConfig(config);
      await seedMediaIfEmpty(db, (m) => console.info('[db] ' + m));
      const mailer = createMailer(config, console);
      const handler = createApp({ db, config, mailer, log: console });
      return { handler };
    })().catch((err) => {
      runtimePromise = null;
      throw err;
    });
  }
  return runtimePromise;
}

export default async function handler(req, res) {
  try {
    // Rewrites in vercel.json route /api/* and /uploads/* here while putting
    // the original pathname in __sikhify_path so the existing router sees it.
    const incoming = new URL(req.url || '/', 'http://localhost');
    const originalPath = incoming.searchParams.get('__sikhify_path');
    if (originalPath) {
      incoming.searchParams.delete('__sikhify_path');
      req.url = originalPath + (incoming.searchParams.toString() ? `?${incoming.searchParams}` : '');
    }
    const { handler: app } = await runtime();
    return app(req, res);
  } catch (err) {
    console.error('[sikhify] function bootstrap failed', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: {
        code: 'configuration',
        message: 'Sikhify server configuration is incomplete. Check the Vercel database environment variables.',
      },
    }));
  }
}
