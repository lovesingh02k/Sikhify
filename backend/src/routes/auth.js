/* Sikhify API — routes/auth.js: signup, login, logout, session, password reset. */
import { HttpError, badRequest, serializeCookie, str } from '../lib/http.js';
import { hashPassword, verifyPassword, newToken, hashToken } from '../lib/security.js';
import { selfUser } from '../lib/serialize.js';
import { SESSION_COOKIE } from '../app.js';
import { USERNAME_RE, PASSWORD_MIN, LIMITS } from '../../../shared/community.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Forgot password" always takes at least this long, so its timing can't reveal whether an account exists. */
export const FORGOT_MIN_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const tooMany = (retryAfter) => new HttpError(429, `Too many attempts — please wait ${Math.ceil(retryAfter / 60)} minute(s) and try again`);

export default function register(router, { db, config, mailer, settings, rate, limits, log }) {
  function startSession(c, user) {
    const { token, hash } = newToken();
    const expires = new Date(Date.now() + config.sessionDays * 864e5).toISOString();
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES (?, ?, ?, ?)')
      .run(hash, user.id, expires, str(c.req.headers['user-agent'], { max: 200 }));
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);
    // Occasional cleanup of expired sessions.
    if (Math.random() < 0.05) db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
    c.setCookie(serializeCookie(SESSION_COOKIE, token, { maxAge: config.sessionDays * 86400, secure: config.cookieSecure }));
  }
  const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  function validatePassword(pw) {
    if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
    if (pw.length > 200) return 'Use 200 characters or fewer';
    return null;
  }

  router.get('/api/auth/me', (c) => ({ user: selfUser(c.user) }));

  router.post('/api/auth/signup', async (c) => {
    rate('auth', 'signup:' + c.ip);
    if (!settings.get('registration_open')) throw new HttpError(403, 'New registrations are closed right now. Please try again later.');
    const name = str(c.body.name, { max: LIMITS.name });
    const username = str(c.body.username, { max: 30 }).toLowerCase();
    const email = str(c.body.email, { max: 200 }).toLowerCase();
    const password = typeof c.body.password === 'string' ? c.body.password : '';
    const fields = {};
    if (name.length < 2) fields.name = 'Enter your name';
    if (!USERNAME_RE.test(username)) fields.username = '3–30 characters: lowercase letters, numbers, dots or underscores';
    if (!EMAIL_RE.test(email)) fields.email = 'Enter a valid email address';
    const pwErr = validatePassword(password);
    if (pwErr) fields.password = pwErr;
    if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw badRequest('Please fix the highlighted fields', { email: 'An account with this email already exists' });
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw badRequest('Please fix the highlighted fields', { username: 'That username is taken' });

    const hash = await hashPassword(password);
    const info = db.prepare('INSERT INTO users (email, username, name, password_hash) VALUES (?, ?, ?, ?)').run(email, username, name, hash);
    const user = getUser(Number(info.lastInsertRowid));
    startSession(c, user);
    return { user: selfUser(getUser(user.id)) };
  });

  router.post('/api/auth/login', async (c) => {
    const identifier = str(c.body.identifier, { max: 200 }).toLowerCase();
    const password = typeof c.body.password === 'string' ? c.body.password : '';
    // Every attempt counts against the address. Only failures count against the account — per account
    // and address (tight), and account-wide (loose) — so nobody can lock a member out from one address.
    const ipHit = limits.loginIp.hit(c.ip);
    if (!ipHit.ok) throw tooMany(ipHit.retryAfter);
    if (!identifier || !password) throw badRequest('Enter your email (or username) and password');
    const pairKey = identifier + '|' + c.ip;
    for (const [lim, key] of [[limits.loginFailIdIp, pairKey], [limits.loginFailId, identifier]]) {
      const p = lim.peek(key);
      if (!p.ok) throw tooMany(p.retryAfter);
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(identifier, identifier);
    // Same work and message whether or not the account exists.
    const ok = user ? await verifyPassword(password, user.password_hash) : await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==');
    if (!user || !ok) {
      limits.loginFailIdIp.hit(pairKey);
      limits.loginFailId.hit(identifier);
      throw new HttpError(401, 'Incorrect email/username or password');
    }
    limits.loginFailIdIp.reset(pairKey);
    if (user.status === 'banned') throw new HttpError(403, 'This account has been banned. Contact the Sikhify team if you believe this is a mistake.');
    startSession(c, user);
    return { user: selfUser(getUser(user.id)) };
  });

  router.post('/api/auth/logout', (c) => {
    if (c.session) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(c.session.tokenHash);
    c.setCookie(serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: config.cookieSecure }));
    return { ok: true };
  });

  router.post('/api/auth/logout-all', (c) => {
    const user = c.requireUser();
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    c.setCookie(serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: config.cookieSecure }));
    return { ok: true };
  });

  router.post('/api/auth/forgot-password', async (c) => {
    const started = Date.now();
    const email = str(c.body.email, { max: 200 }).toLowerCase();
    rate('reset', 'forgot:' + c.ip);
    if (!EMAIL_RE.test(email)) throw badRequest('Please fix the highlighted fields', { email: 'Enter a valid email address' });
    // Per address and per email (counted for unknown emails too, so it reveals nothing).
    rate('resetEmail', email);
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND status != 'banned'").get(email);
    let sending = Promise.resolve();
    if (user) {
      const link = createResetLink(user.id);
      sending = mailer.send({
        to: user.email,
        subject: 'Reset your Sikhify password',
        text: `Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh ${user.name},\n\nSomeone (hopefully you) asked to reset the password for your Sikhify account.\nOpen this link within 1 hour to choose a new password:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
      }).catch((err) => log.error('[mail] failed', err));
    }
    // Same response, and the same minimum time, either way — the form can't be used to discover accounts.
    await Promise.all([sending, sleep(FORGOT_MIN_MS - (Date.now() - started))]);
    return { ok: true, message: 'If an account exists for that email, a reset link has been sent.' };
  });

  function createResetLink(userId) {
    const { token, hash } = newToken();
    db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(userId);
    db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hash, userId, new Date(Date.now() + 3600e3).toISOString());
    return `${config.publicUrl}/reset-password?token=${token}`;
  }
  // Exposed for the admin "issue reset link" action.
  router.createResetLink = createResetLink;

  router.post('/api/auth/reset-password', async (c) => {
    rate('reset', 'reset:' + c.ip);
    const token = str(c.body.token, { max: 200 });
    const password = typeof c.body.password === 'string' ? c.body.password : '';
    const pwErr = validatePassword(password);
    if (pwErr) throw badRequest('Please fix the highlighted fields', { password: pwErr });
    const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(hashToken(token));
    if (!row || row.used_at || row.expires_at <= new Date().toISOString()) throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.');
    const hash = await hashPassword(password);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, new Date().toISOString(), row.user_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(new Date().toISOString(), row.token_hash);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    // Proving ownership by email also lifts an account-wide login block caused by someone else's guesses.
    const owner = getUser(row.user_id);
    if (owner) for (const id of [owner.email, owner.username]) limits.loginFailId.reset(String(id).toLowerCase());
    return { ok: true };
  });

  router.post('/api/auth/change-password', async (c) => {
    const user = c.requireUser();
    rate('auth', 'change:' + user.id);
    const current = typeof c.body.current === 'string' ? c.body.current : '';
    const next = typeof c.body.next === 'string' ? c.body.next : '';
    if (!(await verifyPassword(current, user.password_hash))) throw badRequest('Please fix the highlighted fields', { current: 'Current password is incorrect' });
    const pwErr = validatePassword(next);
    if (pwErr) throw badRequest('Please fix the highlighted fields', { next: pwErr });
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(await hashPassword(next), new Date().toISOString(), user.id);
    // Sign out every other device.
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(user.id, c.session.tokenHash);
    return { ok: true };
  });
}
