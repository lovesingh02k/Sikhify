import { Children, isValidElement } from 'react';
import SiteLink from './SiteLink.jsx';

/** Plain text of a React node (used to key the title). */
function textOf(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return Children.toArray(node.props.children).map(textOf).join('');
  return '';
}

/** The site's navy page header: breadcrumbs, eyebrow, title, subtitle and optional sub-navigation. */
/** `glyph`: an optional Gurmukhi word set large and faint behind the header (real text, hidden from screen readers). */
export default function PageHero({ crumbs = [], eyebrow, title, sub, glyph, children }) {
  return (
    <section aria-labelledby="page-title" className="page-hero">
      {glyph ? <span className="page-hero-glyph" aria-hidden="true" lang="pa">{glyph}</span> : null}
      <div className="sk-container relative z-10">
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <ol>
            <li><a href="/">Home</a></li>
            {crumbs.map((c, i) => (
              <li key={i}>{c.to ? <SiteLink to={c.to}>{c.label}</SiteLink> : <span aria-current="page">{c.label}</span>}</li>
            ))}
          </ol>
        </nav>
        {eyebrow ? <p className="page-hero-eyebrow">{eyebrow}</p> : null}
        {/* The hero entrance splits the title into lines (SplitText rewrites its DOM), so a
            changed title — e.g. after data loads — gets a fresh element instead of an update. */}
        <h1 key={textOf(title)} className="page-hero-title" id="page-title">{title}</h1>
        {sub ? <p className="page-hero-sub">{sub}</p> : null}
        {children}
      </div>
    </section>
  );
}
