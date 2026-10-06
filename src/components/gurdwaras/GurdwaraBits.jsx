/* Small building blocks for the Global Gurdwara Directory: status badges, images, chips, the suggest card, skeletons. */
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../images/OptimizedImage.jsx';
import { FACILITIES, SERVICES, STATUSES } from '../../../shared/gurdwaras.js';

const FACILITY = Object.fromEntries(FACILITIES.map((f) => [f.key, f]));
const SERVICE = Object.fromEntries(SERVICES.map((s) => [s.key, s]));

export function StatusBadge({ status, verification }) {
  const s = STATUSES[status] || STATUSES.active;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`sk-gstatus sk-gstatus-${status}`}>
        <Icon name={status === 'active' ? 'check' : 'alert'} size={12} />{s.label}
      </span>
      {verification === 'needs_verification' ? <span className="sk-gstatus sk-gstatus-unverified"><Icon name="alert" size={12} />Needs verification</span> : null}
    </span>
  );
}

export function FeatureChips({ facilities = [], services = [], max = 6 }) {
  const chips = [
    ...facilities.map((k) => FACILITY[k] && { key: 'f-' + k, label: FACILITY[k].label, icon: FACILITY[k].icon }),
    ...services.map((k) => SERVICE[k] && { key: 's-' + k, label: SERVICE[k].label, icon: 'music' }),
  ].filter(Boolean);
  if (!chips.length) return null;
  const shown = chips.slice(0, max);
  return (
    <ul className="sk-gchips" aria-label="Facilities and services">
      {shown.map((c) => <li key={c.key} className="sk-gchip">{c.icon !== 'music' ? <Icon name={c.icon} size={13} /> : null}{c.label}</li>)}
      {chips.length > max ? <li className="sk-gchip sk-gchip-more">+{chips.length - max} more</li> : null}
    </ul>
  );
}

/** A real photo (with its credit) or a tasteful Sikhify placeholder — never an invented picture. */
export function GurdwaraImage({ image, name, sizes = '200px', priority = false, className = '' }) {
  const placeholder = (
    <span className={`sk-gimg-placeholder ${className}`} role="img" aria-label={`No photo of ${name} yet`}>
      <span className="khanda-mark" aria-hidden="true" />
    </span>
  );
  if (!image) return placeholder;
  const w = image.width || 1600;
  const h = image.height || 1067;
  return (
    <OptimizedImage
      className={`sk-gimg ${className}`}
      src={image.url}
      srcSet={image.thumbUrl && image.thumbUrl !== image.url ? `${image.thumbUrl} 480w, ${image.url} ${w}w` : undefined}
      sizes={sizes}
      width={w}
      height={h}
      alt={image.alt || `Photo of ${name}`}
      priority={priority}
      fallback={placeholder}
    />
  );
}

export function SuggestCard({ compact = false }) {
  return (
    <section className={`sk-gsuggest${compact ? ' is-compact' : ''}`} aria-labelledby="suggest-h">
      <span className="sk-gsuggest-icon" aria-hidden="true"><Icon name="plus" size={20} /></span>
      <div>
        <h2 className="sk-card-title" id="suggest-h">Can&apos;t find a Gurdwara?</h2>
        <p className="sk-card-text">Help us grow our directory by suggesting a missing Gurdwara.</p>
        <Link className="sk-btn sk-btn-gold sk-btn-sm mt-3" to="/directory/gurdwaras/suggest">Suggest a Gurdwara <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}

export function CardSkeleton({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading Gurdwaras…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-gcard" aria-hidden="true">
          <div className="sk-gcard-media sk-skeleton" />
          <div className="sk-gcard-body">
            <div className="sk-skeleton" style={{ height: '1.1rem', width: '55%' }} />
            <div className="sk-skeleton mt-3" style={{ height: '0.85rem', width: '30%' }} />
            <div className="sk-skeleton mt-3" style={{ height: '0.85rem', width: '80%' }} />
            <div className="sk-skeleton mt-4" style={{ height: '1.4rem', width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
