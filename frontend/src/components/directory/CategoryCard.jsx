/* A directory section on the hub: cover, group, name, what it holds, its real record count, Explore. */
import { Link } from 'react-router-dom';
import { SectionCover } from './DirectoryVisual.jsx';
import { visualFor } from '../../data/directoryVisuals.js';
import './directory.css';

/** `count`: undefined while loading, null when unavailable, otherwise the number (with `unit`). */
export default function CategoryCard({ type, group, title, text, to, href, count, unit = 'record', units, countLabel, feature = false }) {
  const v = visualFor(type);
  const many = units || `${unit}s`;
  const countText = countLabel !== undefined ? countLabel
    : count === undefined ? null
      : count === null ? 'Count unavailable right now'
        : count === 0 ? 'Being added — none published yet'
          : <><b>{count.toLocaleString('en-IN')}</b> {count === 1 ? unit : many}</>;
  const body = (
    <>
      <span className={`sk-dcat-media${v.layout === 'portrait' || type === 'gurus' ? ' is-portrait' : ''}`}>
        <SectionCover type={type} sizes={feature ? '(min-width: 1024px) 520px, 100vw' : undefined} />
        <span className="sk-dcat-group">{group}</span>
      </span>
      <span className="sk-dcat-body">
        <span className="sk-dcat-title">{title}</span>
        <span className="sk-dcat-text">{text}</span>
        <span className="sk-dcat-foot">
          <span className="sk-dcat-count">{countText ?? <span className="sk-skeleton" style={{ display: 'inline-block', width: '5rem', height: '0.8rem' }} />}</span>
          <span className="sk-dlink" aria-hidden="true">Explore <span className="sk-darrow">→</span></span>
        </span>
      </span>
    </>
  );
  // Legacy pages (e.g. /sikh-media) need a full page load, so they get a plain link.
  return (
    <li className={feature ? 'is-feature' : undefined} data-motion="reveal">
      {href ? <a className="sk-dcat" href={href}>{body}</a> : <Link className="sk-dcat" to={to}>{body}</Link>}
    </li>
  );
}
