/* ==========================================================================
   Runs the backend API and the frontend Vite server together (no extra
   dependency needed).
     npm run dev       → backend (watch mode) on :8787 + Vite dev server on :5173
     npm run preview   → backend + `vite preview` of the production build
   Ctrl+C stops both (and every process they started).

   Ports are fixed: if 8787 or 5173 is already taken — usually by an earlier
   `npm run dev` that is still running — this stops with a clear message
   instead of quietly starting Vite on another port next to a dead API.
   While running, the API is health-checked so a crashed backend is reported.
   ========================================================================== */
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const backend = path.join(root, 'backend');
const preview = process.argv.includes('--preview');
// Resolved from frontend/ so it works whether npm hoisted Vite to the root or not.
const vite = path.join(path.dirname(createRequire(path.join(frontend, 'package.json')).resolve('vite/package.json')), 'bin', 'vite.js');

const API_PORT = Number(process.env.PORT || 8787);
const API_HOST = process.env.HOST || '127.0.0.1';
const WEB_PORT = preview ? 4173 : 5173;
const API_URL = `http://${API_HOST === '0.0.0.0' ? '127.0.0.1' : API_HOST}:${API_PORT}`;
const say = (msg) => console.log(`[dev] ${msg}`);

/** True when nothing is listening on host:port. */
function portFree(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    // Only "in use" counts; e.g. no IPv6 on this machine (EADDRNOTAVAIL) means nothing can be listening there.
    srv.once('error', (err) => resolve(err.code !== 'EADDRINUSE' && err.code !== 'EACCES'));
    srv.listen(port, host, () => srv.close(() => resolve(true)));
  });
}

async function health(timeout = 3000) {
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(timeout) });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

async function preflight() {
  const problems = [];
  if (!(await portFree(API_PORT, API_HOST))) {
    const h = await health();
    problems.push(h && h.service === 'sikhify-api'
      ? `Port ${API_PORT}: a Sikhify API is already running there (probably an earlier "npm run dev" in another terminal).`
      : `Port ${API_PORT} is in use by another program.`);
  }
  // Vite listens on "localhost", which may be IPv4 or IPv6 — check both.
  if (!(await portFree(WEB_PORT, '127.0.0.1')) || !(await portFree(WEB_PORT, '::1'))) {
    problems.push(`Port ${WEB_PORT} (frontend) is already in use.`);
  }
  if (!problems.length) return;
  for (const p of problems) console.error(`[dev] ${p}`);
  console.error(`[dev] Stop the other process first. In PowerShell, to see who owns a port:
        Get-NetTCPConnection -LocalPort ${API_PORT},${WEB_PORT} -State Listen | Select-Object LocalPort, OwningProcess
      then:  Stop-Process -Id <OwningProcess>`);
  process.exit(1);
}

await preflight();

const procs = [
  { name: 'api', proc: spawn(process.execPath, ['--watch', 'src/index.js'], { cwd: backend, stdio: 'inherit' }) },
  { name: 'web', proc: spawn(process.execPath, [vite, ...(preview ? ['preview'] : []), '--port', String(WEB_PORT), '--strictPort'], { cwd: frontend, stdio: 'inherit' }) },
];

/** Ends a child and everything it started (on Windows, `node --watch` would otherwise leave the API server running). */
function killTree(proc) {
  if (proc.exitCode !== null || proc.signalCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  else proc.kill('SIGTERM');
}

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearInterval(watchdog);
  for (const { proc } of procs) killTree(proc);
  process.exit(code);
}
for (const { name, proc } of procs) {
  proc.on('error', (err) => { console.error(`[dev] could not start ${name}: ${err.message}`); stop(1); });
  proc.on('exit', (code) => {
    if (!stopping) console.error(`[dev] ${name} exited${code ? ` with code ${code}` : ''} — stopping.`);
    stop(code || 0);
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
process.on('SIGHUP', () => stop(0));

// Wait for the API, then keep checking it: `node --watch` keeps running after the
// server crashes (it waits for a file change), so report that instead of failing silently.
let up = false;
let watchdog;
const started = Date.now();
async function check() {
  const h = await health();
  if (h && !up) {
    up = true;
    const db = h.database ? ` — database: ${h.database.provider}, schema v${h.database.schemaVersion}` : '';
    say(`API ready at ${API_URL}${db}`);
    say(`Site: http://localhost:${WEB_PORT}/`);
  } else if (!h && up) {
    up = false;
    console.error(`[dev] API at ${API_URL} stopped responding — see the backend error above (it restarts when you save a backend file).`);
  } else if (!h && !up && Date.now() - started > 30000 && Date.now() - started < 35000) {
    console.error(`[dev] API has not answered at ${API_URL} after 30s — see the backend output above.`);
  }
}
watchdog = setInterval(check, 2500);
check();
