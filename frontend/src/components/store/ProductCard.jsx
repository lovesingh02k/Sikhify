/* One product in the Sikh Store: picture, name, price and its WhatsApp order button. */
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { SectionTile } from '../directory/DirectoryVisual.jsx';
import { formatPrice, whatsappOrderUrl, OUT_OF_STOCK } from '../../../../shared/store.js';
import './store.css';

export function Price({ fields: f = {}, large = false }) {
  const price = formatPrice(f.price);
  const mrp = Number(f.mrp) > Number(f.price) ? formatPrice(f.mrp) : '';
  if (!price) return null;
  return <p className={`sk-price${large ? ' is-large' : ''}`}><span>{price}</span>{mrp ? <s><span className="sr-only">MRP </span>{mrp}</s> : null}</p>;
}

export default function ProductCard({ product: p, headingLevel = 2 }) {
  const f = p.fields || {};
  const H = `h${headingLevel}`;
  const soldOut = f.availability === OUT_OF_STOCK;
  // A product with sizes needs one chosen first, on its own page.
  const choose = (f.variants || []).length > 0;
  return (
    <article className="sk-pcard" aria-labelledby={`p-${p.id}`}>
      <Link className="sk-pcard-media" to={p.url} tabIndex={-1} aria-hidden="true">
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" decoding="async" /> : <SectionTile type="product" />}
        {soldOut ? <span className="sk-stock-out">{OUT_OF_STOCK}</span> : null}
      </Link>
      <div className="sk-pcard-body">
        {p.category ? <p className="sk-pcard-cat">{p.category}</p> : null}
        <H className="sk-pcard-title" id={`p-${p.id}`}><Link to={p.url}>{p.title}</Link></H>
        <Price fields={f} />
        <div className="sk-pcard-foot">
          {soldOut || choose
            ? <Link className="sk-btn sk-btn-sm w-full" to={p.url}>{soldOut ? 'View details' : 'Choose options'}</Link>
            : <a className="sk-wa-btn" href={whatsappOrderUrl(p)} target="_blank" rel="noopener noreferrer"><Icon name="message" size={16} />Order<span className="sr-only"> {p.title} on WhatsApp (opens in a new tab)</span></a>}
        </div>
      </div>
    </article>
  );
}
