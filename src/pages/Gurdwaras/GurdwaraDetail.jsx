/* ==========================================================================
   /directory/gurdwaras/:country/:state/:city/:slug — one Gurdwara.
   Shows only what the record actually holds (empty sections are hidden),
   always with its verification status and sources.
   ========================================================================== */
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { ErrorState, ServiceUnavailable } from '../../components/ui/States.jsx';
import MapView from '../../components/map/MapView.jsx';
import GurdwaraCard from '../../components/gurdwaras/GurdwaraCard.jsx';
import { StatusBadge, GurdwaraImage, SuggestCard } from '../../components/gurdwaras/GurdwaraBits.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { gurdwaraService, directionsUrl, openInMapsUrl } from '../../services/gurdwaras/gurdwaraService.js';
import { FACILITIES, SERVICES, SOURCE_TYPES } from '../../../shared/gurdwaras.js';
import { can } from '../../../shared/roles.js';
import { formatDate } from '../../utils/format.js';

/** Structured data for search engines: the place itself plus its breadcrumb trail. */
function useJsonLd(g) {
  useEffect(() => {
    if (!g) return undefined;
    const origin = window.location.origin;
    const place = {
      '@context': 'https://schema.org', '@type': 'PlaceOfWorship', name: g.name, url: origin + g.url,
      address: { '@type': 'PostalAddress', streetAddress: g.address || undefined, addressLocality: g.city.name, addressRegion: g.state.name, postalCode: g.postalCode || undefined, addressCountry: g.country.code },
    };
    if (g.alsoKnownAs) place.alternateName = g.alsoKnownAs;
    if (g.description) place.description = g.description;
    if (g.phone) place.telephone = g.phone;
    if (g.website) place.sameAs = g.website;
    if (g.latitude !== null) place.geo = { '@type': 'GeoCoordinates', latitude: g.latitude, longitude: g.longitude };
    if (g.images[0]) place.image = origin + g.images[0].url;
    const crumbs = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        ['Gurdwara Directory', '/directory/gurdwaras'],
        [g.country.name, `/directory/gurdwaras/${g.country.slug}`],
        [g.state.name, `/directory/gurdwaras/${g.country.slug}/${g.state.slug}`],
        [g.city.name, `/directory/gurdwaras/${g.country.slug}/${g.state.slug}/${g.city.slug}`],
        [g.name, g.url],
      ].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: origin + path })),
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.dataset.sikhify = 'gurdwara';
    el.textContent = JSON.stringify([place, crumbs]);
    document.head.appendChild(el);
    let img = null;
    if (g.images[0]) {
      img = document.createElement('meta');
      img.setAttribute('property', 'og:image');
      img.setAttribute('content', origin + g.images[0].url);
      document.head.appendChild(img);
    }
    return () => { el.remove(); if (img) img.remove(); };
  }, [g]);
}

function Section({ id, title, children }) {
  return (
    <section className="sk-card sk-gdetail-section" aria-labelledby={id}>
      <h2 className="sk-card-title" id={id}>{title}</h2>
      {children}
    </section>
  );
}

export default function GurdwaraDetail() {
  const { country, state, city, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const res = useAsync(() => gurdwaraService.detail(country, state, city, slug), [country, state, city, slug]);
  const g = res.data && res.data.gurdwara;
  const nearby = (res.data && res.data.nearby) || [];
  const where = g ? `${g.city.name}, ${g.state.name}` : '';
  useReactPage(
    g ? `${g.name} — ${where} | Sikhify` : res.error ? 'Gurdwara not found | Sikhify' : 'Gurdwara | Sikhify',
    g ? (g.description ? g.description.slice(0, 155) : `${g.name} in ${where}, ${g.country.name}: address, map, directions, facilities and services in the Sikhify Global Gurdwara Directory.`) : undefined,
    { noindex: !!(g && (g.verification !== 'verified' || g.archived)) || !!res.error },
  );
  useJsonLd(g);

  if (res.error) {
    return (
      <main id="main-content" className="sk-gdir">
        <div className="sk-container sk-section">
          {res.error.kind === 'unavailable' ? <ServiceUnavailable /> : (
            <ErrorState error={res.error} title={res.error.kind === 'notFound' ? 'This Gurdwara isn’t in the directory' : 'This Gurdwara couldn’t be loaded'} onRetry={res.error.kind === 'notFound' ? undefined : res.reload}>
              <div className="sk-suggest">
                <Link className="sk-btn sk-btn-sm" to={`/directory/gurdwaras/${country}/${state}/${city}`}>Gurdwaras in this city</Link>
                <Link className="sk-btn sk-btn-gold sk-btn-sm" to="/directory/gurdwaras/suggest">Suggest a Gurdwara</Link>
              </div>
            </ErrorState>
          )}
        </div>
      </main>
    );
  }

  if (!g) {
    return (
      <main id="main-content" className="sk-gdir" aria-busy="true">
        <div className="sk-gdetail-hero sk-skeleton" aria-hidden="true" />
        <div className="sk-container sk-section" role="status"><span className="sr-only">Loading Gurdwara…</span>
          <div className="sk-skeleton" style={{ height: '2rem', width: '50%' }} />
          <div className="sk-skeleton mt-4" style={{ height: '1rem', width: '70%' }} />
          <div className="sk-skeleton mt-8" style={{ height: '12rem' }} />
        </div>
      </main>
    );
  }

  const facilities = FACILITIES.filter((f) => g.facilities.includes(f.key));
  const services = SERVICES.filter((s) => g.services.includes(s.key));
  const hero = g.images.find((i) => i.isPrimary) || g.images[0];
  const more = g.images.filter((i) => i !== hero);
  const district = g.district && g.district.toLowerCase() !== g.city.name.toLowerCase() ? `${g.district} district` : '';
  const fullAddress = [g.address, g.city.name, district, g.state.name, g.country.name, g.postalCode].filter(Boolean).join(', ');
  const isStaff = user && can(user, 'content.manage');
  const updateLink = `/directory/gurdwaras/suggest?update=${encodeURIComponent([g.country.slug, g.state.slug, g.city.slug, g.slug].join('/'))}`;

  return (
    <main id="main-content" className="sk-gdir">
      <section className="sk-gdetail-top" aria-labelledby="page-title">
        <div className="sk-container">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol>
              <li><Link to="/directory/gurdwaras">Gurdwaras</Link></li>
              <li><Link to={`/directory/gurdwaras/${g.country.slug}`}>{g.country.name}</Link></li>
              <li><Link to={`/directory/gurdwaras/${g.country.slug}/${g.state.slug}`}>{g.state.name}</Link></li>
              <li><Link to={`/directory/gurdwaras/${g.country.slug}/${g.state.slug}/${g.city.slug}`}>{g.city.name}</Link></li>
              <li><span aria-current="page">{g.name}</span></li>
            </ol>
          </nav>
          <div className="sk-gdetail-head">
            <div className="sk-gdetail-media">
              <GurdwaraImage image={hero} name={g.name} sizes="(min-width: 1024px) 560px, 100vw" priority className="sk-gdetail-img" />
              {hero ? <p className="sk-gcredit">Photo: {hero.sourceUrl ? <a href={hero.sourceUrl} target="_blank" rel="noopener noreferrer">{hero.credit}</a> : hero.credit} · {hero.license}</p> : null}
            </div>
            <div className="sk-gdetail-info">
              <StatusBadge status={g.status} verification={g.verification} />
              <h1 className="sk-gdetail-title" id="page-title">{g.name}</h1>
              {g.officialName && g.officialName !== g.name ? <p className="sk-gdetail-aka">{g.officialName}</p> : null}
              {g.alsoKnownAs ? <p className="sk-gdetail-aka">Also known as {g.alsoKnownAs}</p> : null}
              {g.archived ? <p className="sk-notice mt-3" role="note">This record is archived — only staff can see it.</p> : null}
              {g.verification !== 'verified' && !g.archived ? <p className="sk-notice mt-3" role="note">These details haven’t been verified yet. Please confirm with the Gurdwara before visiting.</p> : null}
              {g.status !== 'active' ? <p className="sk-notice mt-3" role="note">This Gurdwara is listed as {g.status === 'temporarily_closed' ? 'temporarily closed' : 'permanently closed'}.</p> : null}
              <ul className="sk-gdetail-facts">
                <li><Icon name="pin" size={16} /><span>{fullAddress}</span></li>
                {g.phone ? <li><Icon name="phone" size={16} /><a href={`tel:${g.phone.replace(/[^\d+]/g, '')}`}>{g.phone}</a></li> : null}
                {g.email ? <li><Icon name="message" size={16} /><a href={`mailto:${g.email}`}>{g.email}</a></li> : null}
                {g.website ? <li><Icon name="globe" size={16} /><a href={g.website} target="_blank" rel="noopener noreferrer">{g.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}<span className="sr-only"> (opens in a new tab)</span></a></li> : null}
              </ul>
              <div className="sk-gdetail-actions">
                <a className="sk-btn sk-btn-gold" href={directionsUrl(g)} target="_blank" rel="noopener noreferrer"><Icon name="directions" size={16} />Get Directions<span className="sr-only"> (opens in a new tab)</span></a>
                {g.phone ? <a className="sk-btn" href={`tel:${g.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" size={16} />Call</a> : null}
                {g.website ? <a className="sk-btn" href={g.website} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} />Website<span className="sr-only"> (opens in a new tab)</span></a> : null}
                {isStaff ? <Link className="sk-btn" to={`/admin/gurdwaras/${g.id}`}><Icon name="edit" size={16} />Edit</Link> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sk-container sk-gsection">
        <div className="sk-gdetail-grid">
          <div className="sk-stack">
            <Section id="about-h" title="About">
              {g.description ? <p className="sk-card-text sk-gprose">{g.description}</p> : <p className="sk-card-meta">No description has been added yet.</p>}
              {g.establishedYear || g.managementOrganization ? (
                <dl className="sk-dl mt-4">
                  {g.establishedYear ? <><dt>Established</dt><dd>{g.establishedYear}</dd></> : null}
                  {g.managementOrganization ? <><dt>Managed by</dt><dd>{g.managementOrganization}</dd></> : null}
                </dl>
              ) : null}
            </Section>
            {facilities.length || services.length ? (
              <div className="sk-gdetail-two">
                <Section id="fac-h" title="Facilities">
                  {facilities.length ? <ul className="sk-gfeature-list">{facilities.map((f) => <li key={f.key}><Icon name={f.icon} size={16} />{f.label}</li>)}</ul> : <p className="sk-card-meta">No facilities listed yet.</p>}
                </Section>
                <Section id="svc-h" title="Services">
                  {services.length ? <ul className="sk-gfeature-list">{services.map((s) => <li key={s.key}><Icon name="check" size={16} />{s.label}</li>)}</ul> : <p className="sk-card-meta">No services listed yet.</p>}
                </Section>
              </div>
            ) : null}
            {g.programs ? <Section id="prog-h" title="Programs"><p className="sk-card-text sk-gprose">{g.programs}</p></Section> : null}
            {g.openingHours ? <Section id="hours-h" title="Opening Hours"><p className="sk-card-text sk-gprose">{g.openingHours}</p></Section> : null}
            {more.length ? (
              <Section id="photos-h" title="Photos">
                <ul className="sk-gphotos">
                  {more.map((img) => (
                    <li key={img.id}>
                      <GurdwaraImage image={img} name={g.name} sizes="(min-width: 768px) 260px, 50vw" />
                      <p className="sk-gcredit">{img.credit} · {img.license}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>

          <aside className="sk-stack" aria-label="Location and verification">
            <Section id="map-h" title="Map">
              {g.latitude !== null ? (
                <div className="mt-3"><MapView points={[{ id: g.id, lat: g.latitude, lng: g.longitude, title: g.name, subtitle: g.city.name }]} selectedId={g.id} zoom={15} height={260} label={`Map showing ${g.name}`} /></div>
              ) : <p className="sk-card-meta">Map coordinates haven’t been added for this Gurdwara yet.</p>}
              <div className="flex flex-wrap gap-3 mt-3">
                <a className="sk-link-btn" href={openInMapsUrl(g)} target="_blank" rel="noopener noreferrer">Open in Maps <Icon name="external" size={13} /><span className="sr-only"> (opens in a new tab)</span></a>
                <a className="sk-link-btn" href={directionsUrl(g)} target="_blank" rel="noopener noreferrer">Directions <Icon name="external" size={13} /><span className="sr-only"> (opens in a new tab)</span></a>
              </div>
            </Section>
            <Section id="src-h" title="Sources & Verification">
              <p className="sk-card-text flex items-center gap-1.5">
                {g.verification === 'verified'
                  ? <><Icon name="check" size={14} /><span>Verified{g.verifiedAt ? ` on ${formatDate(g.verifiedAt)}` : ''} by the Sikhify team.</span></>
                  : 'Not yet verified by the Sikhify team.'}
              </p>
              <p className="sk-card-meta">Last updated {formatDate(g.updatedAt)}</p>
              {g.sources.length ? (
                <ul className="sk-gsources">
                  {g.sources.map((s) => (
                    <li key={s.id}>
                      {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}<span className="sr-only"> (opens in a new tab)</span></a> : <span>{s.name}</span>}
                      <span className="sk-card-meta"> — {SOURCE_TYPES[s.type] || 'Source'}{s.verifiedAt ? `, checked ${formatDate(s.verifiedAt)}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="sk-card-meta">No sources recorded.</p>}
            </Section>
            <Section id="upd-h" title="Suggest an Update">
              <p className="sk-card-text">Spotted something out of date — timings, phone number, facilities? Tell us and our team will check it.</p>
              <Link className="sk-btn sk-btn-sm mt-3" to={updateLink}><Icon name="edit" size={14} />Suggest an Update</Link>
            </Section>
          </aside>
        </div>

        <section className="mt-12" aria-labelledby="nearby-h">
          <h2 className="sk-section-title" id="nearby-h">Nearby Gurdwaras</h2>
          {nearby.length ? (
            <div className="sk-gnearby mt-5">{nearby.map((n) => <GurdwaraCard key={n.id} g={n} />)}</div>
          ) : (
            <p className="sk-card-text mt-3">
              {g.latitude === null ? 'Nearby Gurdwaras appear once this listing has map coordinates. ' : 'No other verified Gurdwaras are listed within 100 km yet. '}
              <button type="button" className="sk-link-btn" onClick={() => navigate(`/directory/gurdwaras/${g.country.slug}/${g.state.slug}`)}>Browse Gurdwaras in {g.state.name}</button>
            </p>
          )}
        </section>
        <div className="mt-10"><SuggestCard /></div>
      </div>
    </main>
  );
}
