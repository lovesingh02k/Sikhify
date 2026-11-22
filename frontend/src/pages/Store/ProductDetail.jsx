/* /sikh-store/:slug — one product: photos, price, size, quantity and the WhatsApp order button. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { Price } from '../../components/store/ProductCard.jsx';
import { SectionTile } from '../../components/directory/DirectoryVisual.jsx';
import { DirectoryEmpty, DirectoryError, DirectorySkeleton } from '../../components/directory/DirectoryStates.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { entryService } from '../../services/content/contentService.js';
import { STORE_WHATSAPP_DISPLAY, OUT_OF_STOCK, whatsappOrderUrl, whatsappEnquiryUrl } from '../../../../shared/store.js';
import '../../components/directory/directory.css';
import '../../components/store/store.css';

const MAX_QUANTITY = 20;

function Gallery({ product: p }) {
  const pictures = [...new Set([p.imageUrl, ...((p.fields || {}).photos || [])].filter(Boolean))];
  const [shown, setShown] = useState(0);
  if (!pictures.length) return <div className="sk-gallery-main"><SectionTile type="product" /></div>;
  return (
    <div>
      <div className="sk-gallery-main"><img src={pictures[shown]} alt={p.title} decoding="async" /></div>
      {pictures.length > 1 ? (
        <div className="sk-gallery-thumbs" role="group" aria-label="Product photos">
          {pictures.map((src, i) => <button key={src} type="button" aria-pressed={i === shown} aria-label={`Show photo ${i + 1}`} onClick={() => setShown(i)}><img src={src} alt="" loading="lazy" /></button>)}
        </div>
      ) : null}
    </div>
  );
}

function Buy({ product: p }) {
  const f = p.fields || {};
  const variants = f.variants || [];
  const [option, setOption] = useState(variants[0] || '');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => { setOption(variants[0] || ''); setQuantity(1); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const soldOut = f.availability === OUT_OF_STOCK;

  return (
    <div className="sk-buy">
      <Price fields={f} large />
      {soldOut ? <p className="sk-notice" role="note">This product is out of stock right now.</p> : null}
      {p.summary ? <p className="sk-product-text">{p.summary}</p> : null}
      {!soldOut && variants.length ? (
        <div>
          <span className="sk-buy-label" id="opt-label">Size / option</span>
          <div className="sk-chip-row" role="group" aria-labelledby="opt-label">
            {variants.map((v) => <button key={v} type="button" className="sk-chip" aria-pressed={option === v} onClick={() => setOption(v)}>{v}</button>)}
          </div>
        </div>
      ) : null}
      {!soldOut ? (
        <div>
          <span className="sk-buy-label" id="qty-label">Quantity</span>
          <div className="sk-qty" role="group" aria-labelledby="qty-label">
            <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
            <output aria-live="polite">{quantity}</output>
            <button type="button" aria-label="Increase quantity" disabled={quantity >= MAX_QUANTITY} onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
        </div>
      ) : null}
      <a className="sk-wa-btn is-large" href={soldOut ? whatsappEnquiryUrl() : whatsappOrderUrl(p, { option, quantity })} target="_blank" rel="noopener noreferrer">
        <Icon name="message" size={19} />{soldOut ? 'Ask on WhatsApp' : 'Order on WhatsApp'}<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <p className="sk-buy-note">Your order opens as a WhatsApp message to {STORE_WHATSAPP_DISPLAY}. Price, delivery and payment are confirmed there.</p>
      {p.body ? <section aria-labelledby="desc-h"><h2 className="sk-dblock-title" id="desc-h">Description</h2><p className="sk-product-text">{p.body}</p></section> : null}
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const state = useAsync(() => entryService.get('product', slug), [slug]);
  const p = state.data;
  useReactPage(p ? `${p.title} — Sikh Store | Sikhify` : 'Sikh Store | Sikhify', p ? p.summary || `Order ${p.title} on WhatsApp.` : 'Order from the Sikh Store on WhatsApp.', { noindex: !!(p && p.preview) });

  return (
    <main id="main-content" className="sk-container sk-section">
      <nav aria-label="Breadcrumb" className="breadcrumbs mb-6">
        <ol><li><a href="/">Home</a></li><li><Link to="/sikh-store">Sikh Store</Link></li><li><span aria-current="page">{p ? p.title : '…'}</span></li></ol>
      </nav>
      {state.error ? (
        state.error.kind === 'notFound'
          ? <DirectoryEmpty icon="store" title="This product isn’t available" text="It may have been removed from the store."><Link className="sk-btn sk-btn-gold sk-btn-sm" to="/sikh-store">Back to the store</Link></DirectoryEmpty>
          : <DirectoryError error={state.error} title="We couldn’t load this product" onRetry={state.reload} />
      ) : !p ? <DirectorySkeleton count={2} /> : (
        <div className="sk-product">
          <Gallery key={p.id} product={p} />
          <div>
            {p.preview ? <div className="sk-notice mb-4" role="note">Preview: this product is not published, so only staff can see it.</div> : null}
            {p.category ? <p className="sk-pcard-cat">{p.category}</p> : null}
            <h1 className="sk-section-title mb-3">{p.title}</h1>
            <Buy product={p} />
          </div>
        </div>
      )}
    </main>
  );
}
