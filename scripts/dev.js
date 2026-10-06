/* ==========================================================================
   Runs the API server and Vite together (no extra dependency needed).
     npm run dev       → API (watch mode) + Vite dev server
     npm run preview   → API + `vite preview` of the production build
   Ctrl+C stops both.
   ========================================================================== */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview');
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const procs = [
  spawn(process.execPath, ['--watch', 'server/index.js'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [vite, ...(preview ? ['preview'] : [])], { cwd: root, stdio: 'inherit' }),
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
