import { initials } from '../../utils/format.js';

/** Profile photo, or the person's initials (no stock/placeholder photos). */
export default function Avatar({ user, size = 40, className = '' }) {
  const name = (user && user.name) || '?';
  const url = user && user.avatarUrl;
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) };
  if (url) return <img className={`sk-avatar ${className}`.trim()} src={url} alt="" width={size} height={size} style={style} loading="lazy" decoding="async" />;
  return <span className={`sk-avatar sk-avatar-initials ${className}`.trim()} style={style} aria-hidden="true">{initials(name)}</span>;
}
