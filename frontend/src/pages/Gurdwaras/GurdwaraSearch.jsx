/* ==========================================================================
   /directory/gurdwaras[/:country[/:state[/:city]]] — Global Gurdwara Directory.
   Location lives in the path (SEO-friendly, one URL per place); search text,
   status, facilities, services, sort and page live in the query string.
   All searching, filtering, sorting and paging happen on the server.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { ErrorState, ServiceUnavailable } from '../../components/ui/States.jsx';
import GurdwaraCard from '../../components/gurdwaras/GurdwaraCard.jsx';
import FilterPanel, { LocationSelects } from '../../components/gurdwaras/FilterPanel.jsx';
import { SuggestCard, CardSkeleton } from '../../components/gurdwaras/GurdwaraBits.jsx';
import { PanjTakhtSection, FeaturedGurdwaras, StateChips } from '../../components/gurdwaras/GurdwaraShowcase.jsx';
import MapView from '../../components/map/MapView.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { gurdwaraService, openInMapsUrl } from '../../services/gurdwaras/gurdwaraService.js';
import { DEFAULT_STATUS_FILTER, PAGE_SIZES, STATUSES } from '../../../../shared/gurdwaras.js';
import { plural } from '../../utils/format.js';

const list = (v) => (v ? v.split(',').filter(Boolean) : []);
const pathFor = ({ country, state, city }) => ['/directory/gurdwaras', country, country && state, country && state && city].filter(Boolean).join('/');

function LocationPanel({ geo, filters, place, onPlace }) {
  const [manual, setManual] = useState(false);
  return (
    <section className="sk-gpanel" aria-labelledby="near-h">
      <h2 className="sk-gpanel-title" id="near-h"><Icon name="locate" size={16} />Gurdwaras Near Me</h2>
      {geo.status === 'active' ? (
        <>
          <p className="sk-card-text">Showing the closest Gurdwaras to you. Your location is used only for this search and isn&apos;t saved.</p>
          <button type="button" className="sk-btn sk-btn-sm mt-3" onClick={geo.clear}>Stop using my location</button>
        </>
      ) : (
        <>
          <p className="sk-card-text">
            {geo.status === 'denied' ? 'Location access was blocked. You can allow it in your browser settings, or choose a place below.'
              : geo.status === 'unavailable' ? 'Your browser can’t share its location. Choose a place below.'
                : geo.status === 'error' ? 'Your location couldn’t be found just now. Try again, or choose a place below.'
                  : 'Allow location access to find nearby Gurdwaras.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {geo.status !== 'unavailable' ? (
              <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" onClick={geo.request} disabled={geo.status === 'locating'}>
                <Icon name="locate" size={15} />{geo.status === 'locating' ? 'Finding you…' : 'Enable Location'}
              </button>
            ) : null}
            {['denied', 'unavailable', 'error'].includes(geo.status) || manual ? null : (
              <button type="button" className="sk-btn sk-btn-sm" onClick={() => setManual(true)}>Choose Manually</button>
            )}
          </div>
          {['denied', 'unavailable', 'error'].includes(geo.status) || manual ? (
            <div className="sk-gmanual mt-4" role="group" aria-label="Choose a place">
              <p className="sk-gfilter-label" style={{ marginBottom: '0.5rem' }}>Choose Manually</p>
              <LocationSelects country={filters.country} state={filters.state} city={filters.city} place={place} onPlace={onPlace} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function GurdwaraSearch() {
  const navigate = useNavigate();
  const { country = '', state = '', city = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const geo = useGeolocation();
  const statusParam = params.get('status');
  const filters = useMemo(() => ({
    country, state, city,
    q: params.get('q') || '',
    status: statusParam === null ? DEFAULT_STATUS_FILTER : list(statusParam),
    facilities: list(params.get('facilities')),
    services: list(params.get('services')),
    sort: params.get('sort') || (geo.coords ? 'distance' : 'name'),
    page: Number(params.get('page')) || 1,
    pageSize: PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : PAGE_SIZES[0],
  }), [country, state, city, params, statusParam, geo.coords]);

  const meta = useAsync(() => gurdwaraService.meta(), []);
  const place = useAsync(() => (country ? gurdwaraService.place({ country, state, city }) : {}), [country, state, city]);
  const queryKey = JSON.stringify({ ...filters, geo: geo.coords });
  const results = useAsync(() => gurdwaraService.search({
    ...filters, status: filters.status, sort: filters.sort,
    lat: geo.coords && geo.coords.lat, lng: geo.coords && geo.coords.lng,
  }), [queryKey]);

  const [qInput, setQInput] = useState(filters.q);
  const [heroCountry, setHeroCountry] = useState(country);
  const [selectedId, setSelectedId] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [qError, setQError] = useState('');
  const resultsRef = useRef(null);
  useEffect(() => { setQInput(filters.q); }, [filters.q]);
  useEffect(() => { setHeroCountry(country); }, [country]);

  const p = place.data || {};
  const placeName = p.city ? `${p.city.name}, ${p.state.name}` : p.state ? `${p.state.name}, ${p.country.name}` : p.country ? p.country.name : '';
  useReactPage(
    placeName ? `Gurdwaras in ${placeName} | Sikhify` : 'Global Gurdwara Directory | Sikhify',
    placeName ? `Find Gurdwaras in ${placeName}: addresses, maps, Langar and services — verified listings in the Sikhify Global Gurdwara Directory.`
      : 'Explore Gurdwaras around the world. Find nearby Gurdwaras, search by location or discover new ones — verified listings with addresses, maps and services.',
  );

  /* ---------- URL updates */
  const setQuery = (patch, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      const val = Array.isArray(v) ? v.join(',') : v;
      if (k === 'status' && Array.isArray(v)) {
        // Default (Active only) is represented by no parameter, so default URLs stay clean.
        if (v.length === 1 && v[0] === 'active') next.delete('status'); else if (v.length) next.set('status', val); else next.delete('status');
      } else if (val === '' || val === null || val === undefined || (k === 'size' && Number(val) === PAGE_SIZES[0])) next.delete(k);
      else next.set(k, String(val));
    }
    if (!keepPage) next.delete('page');
    setParams(next);
  };
  const setPlace = ({ country: co, state: st, city: ci }) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    const qs = next.toString();
    navigate(pathFor({ country: co, state: st, city: ci }) + (qs ? '?' + qs : ''));
  };
  const onChange = (patch) => setQuery(patch);
  const clearAll = () => { setQInput(''); navigate('/directory/gurdwaras'); };
  const activeCount = (filters.country ? 1 : 0) + filters.facilities.length + filters.services.length + (statusParam !== null ? 1 : 0) + (filters.q ? 1 : 0);

  function submitSearch(e) {
    e.preventDefault();
    const q = qInput.trim();
    if (q && !/[\p{L}\p{N}]/u.test(q)) { setQError('Search with letters or numbers — a name, city, state, country or postal code.'); return; }
    setQError('');
    if (heroCountry !== country) {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q); else next.delete('q');
      next.delete('page');
      navigate(pathFor({ country: heroCountry }) + (next.toString() ? '?' + next : ''));
    } else setQuery({ q });
    resultsRef.current && resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function nearMe() {
    const coords = await geo.request();
    if (coords) {
      setQuery({ sort: 'distance' });
      resultsRef.current && resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  // Sorting by "Closest" without a location falls back to name (and the option is hidden).
  useEffect(() => { if (!geo.coords && params.get('sort') === 'distance') setQuery({ sort: '' }, { keepPage: true }); }, [geo.coords]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = results.data;
  const items = data ? data.items : [];
  const points = items.filter((g) => g.latitude !== null).map((g) => ({
    id: g.id, lat: g.latitude, lng: g.longitude, title: g.name, subtitle: g.city.name, status: (STATUSES[g.status] || {}).label, href: g.url,
  }));
  const selected = items.find((g) => g.id === selectedId);
  const unavailable = (results.error && results.error.kind === 'unavailable') || (meta.error && meta.error.kind === 'unavailable');
  const unknownPlace = country && place.data && (!p.country || (state && !p.state) || (city && !p.city));
  // The directory's front page (no place, search or filter chosen) opens with the Panj Takht and featured historic Gurdwaras.
  const isFront = !country && !filters.q && !filters.facilities.length && !filters.services.length && statusParam === null && !geo.coords && filters.page === 1;
  const isIndianState = country === 'india' && state && !city && !filters.q && filters.page === 1;

  const filterPanel = <FilterPanel filters={filters} place={p} onPlace={setPlace} onChange={onChange} onClear={clearAll} activeCount={activeCount} />;
  const mapPanel = (
    <section className="sk-gpanel" aria-labelledby="map-h">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sk-gpanel-title" id="map-h"><Icon name="map" size={16} />View on Map</h2>
        {selected || items[0] ? (
          <a className="sk-link-btn" href={openInMapsUrl(selected || items[0])} target="_blank" rel="noopener noreferrer">
            Open in Maps <Icon name="external" size={13} /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
      <div className="mt-3">
        {results.loading && !data ? <div className="sk-map sk-skeleton" style={{ height: 300 }} aria-hidden="true" />
          : points.length || geo.coords ? (
            <MapView points={points} you={geo.coords} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }}
              onOpen={(href) => navigate(href)} height={300} label="Map of the Gurdwaras on this page" />
          ) : <div className="sk-map sk-map-off" style={{ height: 180 }}><Icon name="map" size={24} /><p>{items.length ? 'These listings don’t have map coordinates yet.' : 'Results with a location will appear on the map.'}</p></div>}
      </div>
      {points.length && points.length < items.length ? <p className="sk-card-meta">{plural(points.length, 'result')} of {items.length} on this page {points.length === 1 ? 'has' : 'have'} map coordinates.</p> : null}
    </section>
  );

  return (
    <main id="main-content" className="sk-gdir">
      <section className="page-hero sk-ghero" aria-labelledby="page-title">
        <span className="page-hero-glyph" aria-hidden="true" lang="pa">ਗੁਰਦੁਆਰੇ</span>
        <div className="sk-container relative z-10">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol>
              <li><a href="/">Home</a></li>
              <li><Link to="/directory">Directory</Link></li>
              {country ? <li><Link to="/directory/gurdwaras">Gurdwaras</Link></li> : <li><span aria-current="page">Gurdwaras</span></li>}
              {p.country && state ? <li><Link to={pathFor({ country })}>{p.country.name}</Link></li> : p.country ? <li><span aria-current="page">{p.country.name}</span></li> : null}
              {p.state && city ? <li><Link to={pathFor({ country, state })}>{p.state.name}</Link></li> : p.state ? <li><span aria-current="page">{p.state.name}</span></li> : null}
              {p.city ? <li><span aria-current="page">{p.city.name}</span></li> : null}
            </ol>
          </nav>
          <h1 className="page-hero-title" id="page-title" key={placeName}>{placeName ? <>Gurdwaras in <span className="gold">{p.city ? p.city.name : p.state ? p.state.name : p.country.name}</span></> : <>Global <span className="gold">Gurdwara</span> Directory</>}</h1>
          <p className="page-hero-sub">Explore Gurdwaras around the world. Find nearby Gurdwaras, search by location or discover new ones.</p>
          <form className="sk-gsearch" role="search" onSubmit={submitSearch}>
            <div className="sk-gsearch-field">
              <Icon name="search" size={18} />
              <label className="sr-only" htmlFor="g-q">Search Gurdwaras</label>
              <input id="g-q" type="search" className="sk-gsearch-input" autoComplete="off" maxLength={120}
                placeholder="Search Gurdwara, city, state or country..." value={qInput} onChange={(e) => setQInput(e.target.value)} aria-invalid={qError ? 'true' : undefined} aria-describedby={qError ? 'g-q-err' : undefined} />
            </div>
            <label className="sr-only" htmlFor="g-country">Country</label>
            <select id="g-country" className="sk-gsearch-country" value={heroCountry} onChange={(e) => setHeroCountry(e.target.value)}>
              <option value="">All countries</option>
              <CountryOptions current={p.country} />
            </select>
            <button type="submit" className="sk-btn sk-btn-gold sk-gsearch-btn">Search</button>
          </form>
          {qError ? <p className="sk-gsearch-error" id="g-q-err" role="alert">{qError}</p> : null}
          <div className="sk-gquick">
            <button type="button" className="sk-gnear" onClick={nearMe} disabled={geo.status === 'locating'}>
              <Icon name="locate" size={16} />{geo.status === 'locating' ? 'Finding you…' : geo.status === 'active' ? 'Near me · on' : 'Gurdwaras Near Me'}
            </button>
            <ul className="sk-gquick-list" aria-label="Popular countries">
              {(meta.data ? meta.data.quickCountries : []).map((c) => (
                <li key={c.code}><Link className="sk-gquick-chip" aria-current={country === c.slug ? 'page' : undefined} to={pathFor({ country: c.slug })}>{c.name}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {isFront ? (
        <>
          <PanjTakhtSection />
          <div className="sk-container">
            <FeaturedGurdwaras />
            <StateChips />
          </div>
        </>
      ) : null}
      {isIndianState && p.state ? (
        <div className="sk-container"><FeaturedGurdwaras state={state} title={`Historic Gurdwaras in ${p.state.name}`} sub={`Gurdwaras in ${p.state.name} connected with the Guru Sahibs and with defining events of Sikh history.`} /></div>
      ) : null}

      <div className="sk-container sk-gsection" ref={resultsRef}>
        {isFront ? (
          <div className="sk-dsection-head" style={{ marginBottom: '1.25rem' }}>
            <div>
              <p className="sk-dlabel">Search the directory</p>
              <h2 className="sk-section-title">All Gurdwaras</h2>
              <p className="sk-section-sub">Filter by place, facilities and services, see results on the map, or find the Gurdwaras nearest to you.</p>
            </div>
          </div>
        ) : null}
        {unavailable ? <ServiceUnavailable /> : (
          <div className="sk-glayout">
            <aside className="sk-gcol-filters" aria-label="Filters">{filterPanel}</aside>

            <section className="sk-gcol-results" aria-labelledby="results-h" aria-busy={results.loading}>
              <div className="sk-gresults-head">
                <h2 className="sk-gresults-count" id="results-h" aria-live="polite">
                  {data ? `${data.total.toLocaleString('en-IN')} ${data.total === 1 ? 'Gurdwara' : 'Gurdwaras'} Found` : results.error ? 'Gurdwaras' : 'Searching…'}
                  {filters.q ? <span className="sk-gresults-for"> for “{filters.q}”</span> : null}
                </h2>
                <div className="sk-gresults-tools">
                  <button type="button" className="sk-btn sk-btn-sm sk-gmobile-only" onClick={() => setDrawer(true)} aria-haspopup="dialog">
                    <Icon name="filter" size={15} />Filters{activeCount ? ` (${activeCount})` : ''}
                  </button>
                  <button type="button" className="sk-btn sk-btn-sm sk-gmobile-only" aria-expanded={mapOpen} aria-controls="g-mobile-map" onClick={() => setMapOpen((v) => !v)}>
                    <Icon name="map" size={15} />{mapOpen ? 'Hide Map' : 'View Map'}
                  </button>
                  <label className="sk-gsort"><span>Sort by</span>
                    <select className="sk-select sk-select-sm" value={data ? data.sort : filters.sort} onChange={(e) => setQuery({ sort: e.target.value === 'name' && !geo.coords ? '' : e.target.value })}>
                      {geo.coords ? <option value="distance">Closest</option> : null}
                      <option value="name">Name</option>
                      <option value="updated">Recently Updated</option>
                    </select>
                  </label>
                  <label className="sk-gsort"><span className="sr-only">Results per page</span>
                    <select className="sk-select sk-select-sm" value={filters.pageSize} onChange={(e) => setQuery({ size: e.target.value })} aria-label="Results per page">
                      {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} per page</option>)}
                    </select>
                  </label>
                </div>
              </div>
              {mapOpen ? <div id="g-mobile-map" className="sk-gmobile-only mb-4">{mapPanel}</div> : null}

              {unknownPlace ? (
                <div className="sk-gempty">
                  <Icon name="pin" size={26} />
                  <p className="sk-empty-title">This place isn&apos;t in the directory</p>
                  <p>The link may be mistyped, or no Gurdwaras have been listed there yet.</p>
                  <div className="sk-suggest"><Link className="sk-btn sk-btn-sm" to="/directory/gurdwaras">Browse all Gurdwaras</Link><Link className="sk-btn sk-btn-gold sk-btn-sm" to="/directory/gurdwaras/suggest">Suggest a Gurdwara</Link></div>
                </div>
              ) : results.error ? (
                <ErrorState error={results.error} title="Unable to load Gurdwaras" onRetry={results.reload} />
              ) : !data ? <CardSkeleton rows={4} /> : items.length ? (
                <>
                  <div className={`flex flex-col gap-4${results.loading ? ' sk-gloading' : ''}`}>
                    {items.map((g) => <GurdwaraCard key={g.id} g={g} selected={g.id === selectedId} onFocusCard={setSelectedId} />)}
                  </div>
                  <Pagination page={data.page} pages={data.pages} onPage={(pg) => { setQuery({ page: pg > 1 ? pg : '' }, { keepPage: true }); resultsRef.current && resultsRef.current.scrollIntoView({ block: 'start' }); }} />
                </>
              ) : (
                <div className="sk-gempty">
                  <Icon name="search" size={26} />
                  {data.alsoMatching && (data.alsoMatching.needsVerification || data.alsoMatching.otherStatuses) ? (
                    <>
                      <p className="sk-empty-title">No verified, active Gurdwaras found {placeName ? `in ${placeName}` : 'here'} yet.</p>
                      {data.alsoMatching.needsVerification ? (
                        <p>{plural(data.alsoMatching.needsVerification, 'listing')} {data.alsoMatching.needsVerification === 1 ? 'is' : 'are'} awaiting verification by the Sikhify team. Unverified details may be incomplete or out of date.</p>
                      ) : null}
                      {data.alsoMatching.otherStatuses ? <p>{plural(data.alsoMatching.otherStatuses, 'verified listing')} {data.alsoMatching.otherStatuses === 1 ? 'is' : 'are'} temporarily or permanently closed.</p> : null}
                      <div className="sk-suggest">
                        {data.alsoMatching.needsVerification ? <button type="button" className="sk-btn sk-btn-sm" onClick={() => onChange({ status: [...new Set([...filters.status, 'needs_verification'])] })}>Show listings awaiting verification</button> : null}
                        {data.alsoMatching.otherStatuses ? <button type="button" className="sk-btn sk-btn-sm" onClick={() => onChange({ status: [...new Set([...filters.status, 'temporarily_closed', 'permanently_closed'])] })}>Show closed Gurdwaras</button> : null}
                      </div>
                    </>
                  ) : activeCount > (country ? 1 : 0) || filters.q ? (
                    <>
                      <p className="sk-empty-title">No Gurdwaras found</p>
                      <p>Try changing your location or filters.</p>
                      <div className="sk-suggest"><button type="button" className="sk-btn sk-btn-sm" onClick={clearAll}>Clear Filters</button></div>
                    </>
                  ) : (
                    <>
                      <p className="sk-empty-title">No verified Gurdwaras found {placeName ? `in ${placeName} yet` : 'in this location yet'}.</p>
                      <p>Listings appear here once they have been checked against a reliable source.</p>
                    </>
                  )}
                  <div className="sk-suggest"><Link className="sk-btn sk-btn-gold sk-btn-sm" to="/directory/gurdwaras/suggest">Suggest a Gurdwara</Link></div>
                </div>
              )}
              <div className="sk-gmobile-only mt-6"><SuggestCard /></div>
            </section>

            <aside className="sk-gcol-side" aria-label="Map and location">
              <div className="sk-gdesktop-only">{mapPanel}</div>
              <LocationPanel geo={geo} filters={filters} place={p} onPlace={setPlace} />
              <div className="sk-gdesktop-only"><SuggestCard compact /></div>
            </aside>
          </div>
        )}
      </div>

      <Dialog open={drawer} onClose={() => setDrawer(false)} title="Filters">
        {filterPanel}
        <button type="button" className="sk-btn sk-btn-gold w-full mt-5" onClick={() => setDrawer(false)}>
          Show {data ? plural(data.total, 'result') : 'results'}
        </button>
      </Dialog>
    </main>
  );
}

/** All countries that have listings (from the database), for the hero's country selector. */
function CountryOptions({ current }) {
  const loc = useAsync(() => gurdwaraService.locations(), []);
  const countries = loc.data ? loc.data.countries : [];
  const all = current && !countries.some((c) => c.slug === current.slug) ? [current, ...countries] : countries;
  return all.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>);
}
