import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { StatusBadge, FeatureChips, GurdwaraImage } from './GurdwaraBits.jsx';
import { DesignationBadge } from './GurdwaraShowcase.jsx';
import { formatDistance, placeLabel } from '../../services/gurdwaras/gurdwaraService.js';

/** One search result: photo, name, status, address, phone, distance, chips, View Details. */
export default function GurdwaraCard({ g, selected = false, onFocusCard }) {
  const where = [g.address, placeLabel(g)].filter(Boolean).join(', ');
  return (
    <article className={`sk-gcard${selected ? ' is-selected' : ''}`} id={`g-${g.id}`} aria-labelledby={`g-${g.id}-name`}
      onMouseEnter={() => onFocusCard && onFocusCard(g.id)} onFocus={() => onFocusCard && onFocusCard(g.id)}>
      <Link to={g.url} className="sk-gcard-media" tabIndex={-1} aria-hidden="true">
        <GurdwaraImage image={g.image} name={g.name} sizes="(min-width: 768px) 200px, 100vw" />
      </Link>
      <div className="sk-gcard-body">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="sk-gcard-name" id={`g-${g.id}-name`}><Link to={g.url}>{g.name}</Link></h3>
          {g.distanceKm !== null && g.distanceKm !== undefined ? <span className="sk-gcard-distance"><Icon name="locate" size={13} />{formatDistance(g.distanceKm)}</span> : null}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><DesignationBadge designation={g.designation} /><StatusBadge status={g.status} verification={g.verification} /></div>
        <p className="sk-gcard-line"><Icon name="pin" size={14} /><span>{where}</span></p>
        {g.summary ? <p className="sk-gcard-line sk-gcard-summary">{g.summary}</p> : null}
        {g.phone ? <p className="sk-gcard-line"><Icon name="phone" size={14} /><a href={`tel:${g.phone.replace(/[^\d+]/g, '')}`}>{g.phone}</a></p> : null}
        <div className="sk-gcard-foot">
          <FeatureChips facilities={g.facilities} services={g.services} max={5} />
          <Link className="sk-btn sk-btn-sm sk-gcard-cta" to={g.url}>View Details <span aria-hidden="true">→</span><span className="sr-only"> for {g.name}</span></Link>
        </div>
      </div>
    </article>
  );
}
