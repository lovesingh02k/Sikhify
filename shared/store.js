/* ==========================================================================
   Sikhify — shared/store.js
   The Sikh Store takes orders on WhatsApp: there is no cart or online payment.
   Products are ordinary records of the `product` content type
   (shared/contentTypes.js), managed in Admin → Sikh Store.
   The Android app builds the same message in app/lib/services/store.dart.
   ========================================================================== */
export const STORE_WHATSAPP = '919806249818';
export const STORE_WHATSAPP_DISPLAY = '+91 98062 49818';
export const OUT_OF_STOCK = 'Out of stock';
const SITE = 'https://www.sikhify.in';

/** 1250 → "₹1,250"; empty when there is no valid price. */
export function formatPrice(value) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) return '';
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const waLink = (text) => `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(text)}`;

/** The WhatsApp link that opens a chat with this product's order already written. */
export function whatsappOrderUrl(product, { option = '', quantity = 1 } = {}) {
  const f = product.fields || {};
  const lines = [
    'Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh 🙏',
    'I would like to order:',
    '',
    `Product: ${product.title}`,
    option ? `Option: ${option}` : '',
    `Quantity: ${quantity}`,
    formatPrice(f.price) ? `Price: ${formatPrice(f.price)} each` : '',
    product.url ? `Link: ${SITE}${product.url}` : '',
  ];
  return waLink(lines.filter((l, i) => l || i === 2).join('\n'));
}

/** A general question about the store. */
export const whatsappEnquiryUrl = () => waLink('Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh 🙏\nI have a question about the Sikh Store.');
