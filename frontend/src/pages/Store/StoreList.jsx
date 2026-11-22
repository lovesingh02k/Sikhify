/* ==========================================================================
   /sikh-store — the products published in Admin → Sikh Store.
   Filters live in the URL (?q=&category=&page=). Orders go to WhatsApp.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ProductCard from '../../components/store/ProductCard.jsx';
import DirectorySearch from '../../components/directory/DirectorySearch.jsx';
import { DirectorySkeleton, DirectoryEmpty, DirectoryError } from '../../components/directory/DirectoryStates.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { CONTENT_TYPES } from '../../../../shared/contentTypes.js';
import { STORE_WHATSAPP_DISPLAY, whatsappEnquiryUrl } from '../../../../shared/store.js';
import '../../components/directory/directory.css';
import '../../components/store/store.css';

export default function StoreList() {
  const t = CONTENT_TYPES.product;
  useReactPage('Sikh Store — Order on WhatsApp | Sikhify', t.description);
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [q, setQ] = useState(get('q'));
  const filters = { q: get('q'), category: get('category'), page: get('page') || 1 };
  const list = useAsync(() => entryService.list('product', filters), [JSON.stringify(filters)]);
  const facets = useAsync(() => entryService.facets('product'), []);

  function update(patch) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  }
  useEffect(() => { setQ(get('q')); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setTimeout(() => { if (q !== get('q')) update({ q }); }, 300);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = list.data;
  const filtered = !!(filters.q || filters.category);
  const categories = (facets.data && facets.data.categories) || [];

  return (
    <main id="main-content">
      <section className="page-hero" aria-labelledby="page-title">
        <span className="page-hero-glyph" aria-hidden="true" lang="pa">ਸਟੋਰ</span>
        <div className="sk-container">
          <nav aria-label="Breadcrumb" className="breadcrumbs"><ol><li><a href="/">Home</a></li><li><span aria-current="page">{t.plural}</span></li></ol></nav>
          <p className="page-hero-eyebrow">Order on WhatsApp</p>
          <h1 key={t.plural} className="page-hero-title" id="page-title">{t.plural}</h1>
          <p className="page-hero-sub">{t.description}</p>
        </div>
      </section>

      <div className="sk-container sk-section">
        <div className="sk-dtoolbar">
          <DirectorySearch id="store-search" label="Search the store" value={q} onChange={setQ} onSubmit={(v) => update({ q: v })} placeholder="Search products…" />
          {categories.length ? (
            <div className="sk-chip-row" role="group" aria-label="Filter by category">
              <button type="button" className="sk-chip" aria-pressed={!filters.category} onClick={() => update({ category: '' })}>All</button>
              {categories.map((c) => <button key={c.value} type="button" className="sk-chip" aria-pressed={filters.category === c.value} onClick={() => update({ category: filters.category === c.value ? '' : c.value })}>{c.value}</button>)}
            </div>
          ) : null}
        </div>

        <div className="mt-8" aria-busy={list.loading}>
          {list.error ? <DirectoryError error={list.error} title="We couldn’t load the store" onRetry={list.reload} />
            : !data ? <DirectorySkeleton />
              : data.items.length ? (
                <>
                  <ul className="sk-store-grid">{data.items.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}</ul>
                  <Pagination page={data.page} pages={data.pages} onPage={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                </>
              ) : filtered ? (
                <DirectoryEmpty title="No products found" text="Try a different word or remove the filter.">
                  <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" onClick={() => { setQ(''); setParams(new URLSearchParams()); }}>Show all products</button>
                </DirectoryEmpty>
              ) : (
                <DirectoryEmpty icon="store" title="Products are being added" text="Message us on WhatsApp to ask what is available." />
              )}
        </div>

        <p className="sk-buy-note mt-8">
          Questions? <a className="panel-view-all" href={whatsappEnquiryUrl()} target="_blank" rel="noopener noreferrer"><Icon name="message" size={14} /> WhatsApp {STORE_WHATSAPP_DISPLAY}<span className="sr-only"> (opens in a new tab)</span></a>
        </p>
      </div>
    </main>
  );
}
