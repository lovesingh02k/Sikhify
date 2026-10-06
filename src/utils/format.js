/* Sikhify — display formatting helpers. */

export function relativeTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const sec = Math.round((Date.now() - date.getTime()) / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '';
  // Plain YYYY-MM-DD dates are calendar dates, not instants: format them in UTC.
  const plain = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = plain ? new Date(iso + 'T00:00:00Z') : new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(plain ? { timeZone: 'UTC' } : {}), ...opts });
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatCount(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n || 0);
}

export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function initials(name) {
  return String(name || '?').replace(/^(Bhai|Bibi|Giani|Dr\.?|Sant|Prof\.?)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

/** Calls the site toast (from the core controller) when available. */
export function toast(message, kind) {
  if (window.Sikhify && window.Sikhify.toast) window.Sikhify.toast(message, kind);
}

/** Native share sheet, or copy the link. */
export async function shareLink({ title, text, url }) {
  if (window.Sikhify && window.Sikhify.share) return window.Sikhify.share({ title, text, url });
  if (navigator.share) return navigator.share({ title, text, url }).catch(() => {});
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast("Couldn't copy — please copy manually", 'error'); }
  return undefined;
}
