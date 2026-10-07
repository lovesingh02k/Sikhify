/* ==========================================================================
   /<type> — one directory listing (Events, Personalities, Websites, …).
   Filters live in the URL (?q=&category=&country=&state=&district=&city=&when=&view=)
   so a filtered list can be shared. Place filters show only values that
   exist in published records. Cards follow the section's visual layout.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import DirectoryCard from '../../components/directory/DirectoryCard.jsx';
import DirectorySearch from '../../components/directory/DirectorySearch.jsx';
import { SectionCover } from '../../components/directory/DirectoryVisual.jsx';
import { DirectorySkeleton, DirectoryEmpty, DirectoryError } from '../../components/directory/DirectoryStates.jsx';
import { SubmitCta } from '../../components/directory/DirectoryTrust.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { CONTENT_TYPES } from '../../../../shared/contentTypes.js';
import { SUBMISSION_KINDS } from '../../../../shared/community.js';
import { visualFor } from '../../data/directoryVisuals.js';
import '../../components/directory/directory.css';

const LEVEL_LABEL = { country: 'Country', state: 'State / province', district: 'District', city: 'City' };
const WHEN = [['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All']];

export default function DirectoryList({ type }) {
  const t = CONTENT_TYPES[type];
  const v = visualFor(type);
  useReactPage(`${t.plural} — Sikh Directory | Sikhify`, t.description);
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [q, setQ] = useState(get('q'));
  const hierarchy = t.hierarchy || [];
  const when = get('when') || (type === 'event' ? 'upcoming' : '');
  const view = get('view') === 'list' ? 'list' : 'grid';

  const filters = { q: get('q'), category: get('category'), when, page: get('page') || 1 };
  hierarchy.forEach((l) => { filters[l] = get(l); });
  const key = JSON.stringify(filters);
  const list = useAsync(() => entryService.list(type, filters), [type, key]);
  const facetParams = {};
  hierarchy.forEach((l) => { if (get(l)) facetParams[l] = get(l); });
  const facets = useAsync(() => entryService.facets(type, facetParams), [type, JSON.stringify(facetParams)]);

  useEffect(() => { setQ(get('q')); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setTimeout(() => { if (q !== get('q')) update({ q }); }, 300);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, val]) => { if (val) next.set(k, val); else next.delete(k); });
    if (!('page' in patch) && !('view' in patch)) next.delete('page');
    // Changing a level clears the levels below it.
    const changed = hierarchy.findIndex((l) => l in patch);
    if (changed !== -1) hierarchy.slice(changed + 1).forEach((l) => next.delete(l));
    setParams(next, { replace: false });
  }
  const clearAll = () => { setQ(''); const next = new URLSearchParams(); if (view === 'list') next.set('view', 'list'); setParams(next); };
  const submitTo = SUBMISSION_KINDS[type] ? `/submit?kind=${type}` : '/submit?kind=correction';
  const submitLabel = SUBMISSION_KINDS[type] ? `Submit ${/^[aeiou]/i.test(t.label) ? 'an' : 'a'} ${t.label.toLowerCase()}` : 'Suggest information';
  const active = [
    filters.q && { k: 'q', label: `“${filters.q}”` },
    filters.category && { k: 'category', label: filters.category },
    ...hierarchy.filter((l) => filters[l]).map((l) => ({ k: l, label: filters[l] })),
  ].filter(Boolean);
  const data = list.data;

  return (
    <main id="main-content">
      <section className="page-hero sk-dlist-hero" aria-labelledby="page-title">
        <span className="page-hero-glyph" aria-hidden="true" lang="pa">{v.glyph}</span>
        <div className="sk-container">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol><li><a href="/">Home</a></li><li><Link to="/directory">Directory</Link></li><li><span aria-current="page">{t.plural}</span></li></ol>
          </nav>
          <div className="sk-dlist-hero-grid">
            <div>
              <p className="page-hero-eyebrow">Directory · {t.group}</p>
              <h1 className="page-hero-title" id="page-title">{t.plural}</h1>
              <p className="page-hero-sub">{t.description}</p>
              <nav aria-label="Actions" className="page-subnav">
                <Link to={submitTo}>{submitLabel}</Link>
                <Link to="/directory">All directory sections</Link>
              </nav>
            </div>
            <div className={`sk-dlist-hero-art${v.layout === 'portrait' ? ' is-portrait' : ''}`} data-motion="hero-item"><SectionCover type={type} sizes="300px" priority /></div>
          </div>
        </div>
      </section>

      <div className="sk-container sk-section">
        <div className="sk-dtoolbar">
          <DirectorySearch id="dir-search" label={`Search ${t.plural}`} value={q} onChange={setQ} onSubmit={(val) => update({ q: val })}
            placeholder={`Search ${t.plural.toLowerCase()} by name, place or keyword…`} />

          {type === 'event' ? (
            <div className="sk-chip-row" role="group" aria-label="When">
              {WHEN.map(([val, l]) => <button key={val} type="button" className="sk-chip" aria-pressed={when === val} onClick={() => update({ when: val })}>{l}</button>)}
            </div>
          ) : null}
          {facets.data && facets.data.categories.length ? (
            <div className="sk-chip-row" role="group" aria-label="Filter by category">
              <button type="button" className="sk-chip" aria-pressed={!filters.category} onClick={() => update({ category: '' })}>All</button>
              {facets.data.categories.map((c) => (
                <button key={c.value} type="button" className="sk-chip" aria-pressed={filters.category === c.value} onClick={() => update({ category: filters.category === c.value ? '' : c.value })}>
                  {c.value}<span className="sk-count">{c.n}</span>
                </button>
              ))}
            </div>
          ) : null}
          {hierarchy.length && facets.data ? (
            <div className="sk-filters" role="group" aria-label="Browse by place">
              {hierarchy.map((level, i) => {
                const options = facets.data.levels[level];
                if (!options) return null;
                if (i > 0 && !filters[hierarchy[i - 1]]) return null;
                return (
                  <div className="sk-form-field" key={level}>
                    <label className="sk-form-label" htmlFor={`lvl-${level}`}>{LEVEL_LABEL[level]}</label>
                    <select id={`lvl-${level}`} className="sk-form-input sk-form-select" value={filters[level]} onChange={(e) => update({ [level]: e.target.value })}>
                      <option value="">All</option>
                      {options.map((o) => <option key={o.value} value={o.value}>{o.value} ({o.n})</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="sk-dtoolbar-row">
            <p className="sk-dcount" aria-live="polite">
              {data ? <><b>{data.total.toLocaleString('en-IN')}</b> {data.total === 1 ? 'record' : 'records'}{filters.q ? <> for “{filters.q}”</> : null}</> : list.error ? '' : 'Loading…'}
            </p>
            <div className="sk-dview" role="group" aria-label="Layout">
              <button type="button" aria-pressed={view === 'grid'} onClick={() => update({ view: '' })}><Icon name="dashboard" size={14} />Grid</button>
              <button type="button" aria-pressed={view === 'list'} onClick={() => update({ view: 'list' })}><Icon name="sliders" size={14} />List</button>
            </div>
          </div>
          {active.length ? (
            <div className="sk-dactive" aria-label="Active filters">
              {active.map((a) => (
                <button key={a.k} type="button" className="sk-dactive-chip" onClick={() => (a.k === 'q' ? setQ('') : update({ [a.k]: '' }))}>
                  {a.label}<Icon name="close" size={13} /><span className="sr-only"> — remove filter</span>
                </button>
              ))}
              <button type="button" className="sk-link-btn" onClick={clearAll}>Clear all</button>
            </div>
          ) : null}
        </div>

        <div className="mt-8" aria-busy={list.loading}>
          {list.error ? <DirectoryError error={list.error} title={`We couldn’t load ${t.plural}`} onRetry={list.reload} />
            : !data ? <DirectorySkeleton view={view} portrait={v.layout === 'portrait'} />
              : data.items.length ? (
                <>
                  <ul className={`sk-dgrid${view === 'list' ? ' is-list' : ''}${list.loading ? ' sk-gloading' : ''}`}>
                    {data.items.map((e) => <li key={e.id} data-motion="reveal"><DirectoryCard entry={e} type={type} /></li>)}
                  </ul>
                  <Pagination page={data.page} pages={data.pages} onPage={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                </>
              ) : active.length ? (
                <DirectoryEmpty title="Nothing found yet" text={`We couldn’t find any ${t.plural.toLowerCase()} matching these filters. Try a different spelling or remove a filter.`}>
                  <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" onClick={clearAll}>Clear filters</button>
                </DirectoryEmpty>
              ) : type === 'event' && when === 'upcoming' ? (
                <DirectoryEmpty icon="calendar" title="No upcoming events are listed yet" text="Gurpurabs, Nagar Kirtans and Samagams appear here once they have been announced and reviewed.">
                  <button type="button" className="sk-btn sk-btn-sm" onClick={() => update({ when: 'past' })}>See past events</button>
                  <Link className="sk-btn sk-btn-gold sk-btn-sm" to={submitTo}>{submitLabel}</Link>
                </DirectoryEmpty>
              ) : (
                <DirectoryEmpty icon="khanda" title={`${t.plural} are being added`} text="Records appear here after they have been reviewed against their sources. You can help by sending one with its source.">
                  <Link className="sk-btn sk-btn-gold sk-btn-sm" to={submitTo}>{submitLabel}</Link>
                  <Link className="sk-btn sk-btn-sm" to="/directory">Explore other sections</Link>
                </DirectoryEmpty>
              )}
        </div>

        <SubmitCta title={`Know of ${/^[aeiou]/i.test(t.label) ? 'an' : 'a'} ${t.label.toLowerCase()} we should list?`} to={submitTo} label={submitLabel} />
      </div>
    </main>
  );
}
