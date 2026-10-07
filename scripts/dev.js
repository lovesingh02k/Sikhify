/* ==========================================================================
   Runs the backend API and the frontend Vite server together (no extra
   dependency needed).
     npm run dev       → backend (watch mode) + Vite dev server
     npm run preview   → backend + `vite preview` of the production build
   Ctrl+C stops both.
   ========================================================================== */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const backend = path.join(root, 'backend');
const preview = process.argv.includes('--preview');
// Resolved from frontend/ so it works whether npm hoisted Vite to the root or not.
const vite = path.join(path.dirname(createRequire(path.join(frontend, 'package.json')).resolve('vite/package.json')), 'bin', 'vite.js');

const procs = [
  spawn(process.execPath, ['--watch', 'src/index.js'], { cwd: backend, stdio: 'inherit' }),
  spawn(process.execPath, [vite, ...(preview ? ['preview'] : [])], { cwd: frontend, stdio: 'inherit' }),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (!p.killed) p.kill();
  process.exit(code);
}
for (const p of procs) p.on('exit', (code) => stop(code || 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
