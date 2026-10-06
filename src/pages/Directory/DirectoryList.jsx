/* ==========================================================================
   /<type> — one directory listing (Gurdwaras, Events, News, …).
   Filters live in the URL (?q=&category=&country=&state=&district=&city=&when=)
   so a filtered list can be shared. Gurdwaras browse Country → State →
   District → City using only values that exist in published records.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { AsyncView, Empty, Loading } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { CONTENT_TYPES } from '../../../shared/contentTypes.js';
import { SUBMISSION_KINDS } from '../../../shared/community.js';
import { formatDate, plural } from '../../utils/format.js';
import { VerificationLine } from './EntryDetail.jsx';

const LEVEL_LABEL = { country: 'Country', state: 'State / province', district: 'District', city: 'City' };

export default function DirectoryList({ type }) {
  const t = CONTENT_TYPES[type];
  useReactPage(`${t.plural} — Sikh Directory — Sikhify.in`, t.description);
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [q, setQ] = useState(get('q'));
  const hierarchy = t.hierarchy || [];
  const isDated = !!t.sort;
  const when = get('when') || (type === 'event' ? 'upcoming' : '');

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
    Object.entries(patch).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    if (!('page' in patch)) next.delete('page');
    // Changing a level clears the levels below it.
    const changed = hierarchy.findIndex((l) => l in patch);
    if (changed !== -1) hierarchy.slice(changed + 1).forEach((l) => next.delete(l));
    setParams(next, { replace: false });
  }
  const submitTo = SUBMISSION_KINDS[type] ? `/submit?kind=${type}` : '/submit?kind=correction';
  const submitLabel = SUBMISSION_KINDS[type] ? `Submit ${/^[aeiou]/i.test(t.label) ? 'an' : 'a'} ${t.label.toLowerCase()}` : 'Suggest information';
  const anyFilter = filters.q || filters.category || hierarchy.some((l) => filters[l]);

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Directory', to: '/directory' }, { label: t.plural }]} glyph="ਸਿੱਖ" eyebrow={`Directory · ${t.group}`} title={t.plural} sub={t.description}>
        <nav aria-label="Actions" className="page-subnav">
          <Link to={submitTo}>{submitLabel}</Link>
          <Link to="/directory">All directory sections</Link>
        </nav>
      </PageHero>
      <div className="sk-container sk-section">
        <div className="sk-toolbar">
          <div className="sk-toolbar sk-toolbar-row">
            <div className="sk-field">
              <Icon name="search" />
              <label className="sr-only" htmlFor="dir-search">Search {t.plural}</label>
              <input id="dir-search" className="sk-input" type="search" autoComplete="off" placeholder={`Search ${t.plural.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <p className="sk-result-count" aria-live="polite">{list.data ? plural(list.data.total, 'record') : ''}</p>
          </div>
          {isDated && type === 'event' ? (
            <div className="sk-chip-row" role="group" aria-label="When">
              {[['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All']].map(([v, l]) => (
                <button key={v} type="button" className="sk-chip" aria-pressed={when === v} onClick={() => update({ when: v })}>{l}</button>
              ))}
            </div>
          ) : null}
          {facets.data && facets.data.categories.length ? (
            <div className="sk-chip-row" role="group" aria-label="Filter by category">
              <button type="button" className="sk-chip" aria-pressed={!filters.category} onClick={() => update({ category: '' })}>All</button>
              {facets.data.categories.map((c) => (
                <button key={c.value} type="button" className="sk-chip" aria-pressed={filters.category === c.value} onClick={() => update({ category: c.value })}>
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
          {anyFilter ? <div><button type="button" className="sk-link-btn" onClick={() => { setQ(''); setParams(new URLSearchParams()); }}>Clear all filters</button></div> : null}
        </div>

        <div className="mt-8">
          <AsyncView state={list} loading={<Loading rows={3} />}>
            {(data) => (data.items.length ? (
              <>
                <ul className="sk-grid sk-grid-3" role="list">
                  {data.items.map((e) => (
                    <li key={e.id}>
                      <Link className="sk-card sk-card-link h-full" to={e.url}>
                        {e.category ? <span className="sk-badge">{e.category}</span> : null}
                        <h2 className="sk-card-title mt-2">{e.title}</h2>
                        {e.date ? <p className="sk-card-meta"><Icon name="calendar" size={13} /> {formatDate(e.date, { weekday: 'short' })}{e.fields.start_time ? ` · ${e.fields.start_time}` : ''}</p> : null}
                        {[e.city, e.district, e.state, e.country].some(Boolean) ? <p className="sk-card-meta"><Icon name="pin" size={13} /> {[e.city, e.district, e.state, e.country].filter(Boolean).join(', ')}</p> : null}
                        {e.summary ? <p className="sk-card-text">{e.summary}</p> : null}
                        <div className="sk-card-foot"><VerificationLine v={e.verification} compact /></div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Pagination page={data.page} pages={data.pages} onPage={(p) => update({ page: String(p) })} />
              </>
            ) : (
              <Empty
                icon="search"
                title={anyFilter ? `No ${t.plural.toLowerCase()} match these filters` : type === 'event' && when === 'upcoming' ? 'No upcoming events are listed yet' : `No ${t.plural.toLowerCase()} have been published yet`}
                text={anyFilter ? 'Try clearing a filter or a different spelling.' : 'Records appear here after they are reviewed and verified. You can help by submitting one with its source.'}
              >
                {anyFilter ? <button type="button" className="sk-btn sk-btn-sm" onClick={() => { setQ(''); setParams(new URLSearchParams()); }}>Clear filters</button> : null}
                <Link className="sk-btn sk-btn-sm sk-btn-gold" to={submitTo}>{submitLabel}</Link>
                {type === 'event' && when === 'upcoming' ? <button type="button" className="sk-btn sk-btn-sm" onClick={() => update({ when: 'past' })}>See past events</button> : null}
              </Empty>
            ))}
          </AsyncView>
        </div>
      </div>
    </main>
  );
}
