/* ==========================================================================
   Creates the first Master Admin, or promotes an existing account.
   There is no default admin account or password anywhere in the code.

     npm run admin:create -- --email you@example.com --name "Your Name" --username you
     npm run admin:create -- --email existing@example.com          (promote)

   The password is read from SIKHIFY_ADMIN_PASSWORD or prompted for, so it
   never appears in shell history.
   ========================================================================== */
import readline from 'node:readline';
import { loadConfig } from '../config.js';
import { openDatabaseForConfig } from '../db/database.js';
import { hashPassword } from '../lib/security.js';
import { USERNAME_RE, PASSWORD_MIN } from '../../shared/community.js';

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function ask(question, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
  });
}

const email = (arg('email') || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:create -- --email you@example.com [--name "Your Name"] [--username you]');
  process.exit(1);
}
const config = loadConfig();
const db = await openDatabaseForConfig(config);
const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (existing) {
  db.prepare("UPDATE users SET role = 'admin', status = 'active', updated_at = ? WHERE id = ?").run(new Date().toISOString(), existing.id);
  console.log(`✔ ${existing.name} (@${existing.username}) is now a Master Admin.`);
  process.exit(0);
}

const name = (arg('name') || '').trim();
const username = (arg('username') || '').trim().toLowerCase();
if (name.length < 2 || !USERNAME_RE.test(username)) {
  console.error('To create a new account, also pass --name "Your Name" and --username (3–30 lowercase letters, numbers, dots or underscores).');
  process.exit(1);
}
if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
  console.error(`The username “${username}” is taken.`);
  process.exit(1);
}
let password = process.env.SIKHIFY_ADMIN_PASSWORD || '';
if (!password) password = await ask(`Password for ${email} (min ${PASSWORD_MIN} characters): `, true);
if (password.length < PASSWORD_MIN) {
  console.error(`The password must be at least ${PASSWORD_MIN} characters.`);
  process.exit(1);
}
db.prepare("INSERT INTO users (email, username, name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')").run(email, username, name, await hashPassword(password));
console.log(`✔ Master Admin ${name} (@${username}) created. Sign in at /login.`);
