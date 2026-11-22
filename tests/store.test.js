/* The Sikh Store's WhatsApp links and prices (shared/store.js) and its product schema. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORE_WHATSAPP, formatPrice, whatsappOrderUrl, whatsappEnquiryUrl } from '../shared/store.js';
import { validateContent, CONTENT_TYPES } from '../shared/contentTypes.js';

const message = (url) => decodeURIComponent(new URL(url).search.replace('?text=', ''));

test('orders go to the store number, with the country code', () => {
  assert.equal(STORE_WHATSAPP, '919806249818');
  assert.match(whatsappEnquiryUrl(), /^https:\/\/wa\.me\/919806249818\?text=/);
});

test('prices use Indian digit grouping', () => {
  assert.equal(formatPrice(1250), '₹1,250');
  assert.equal(formatPrice(125000), '₹1,25,000');
  assert.equal(formatPrice(0), '₹0');
  assert.equal(formatPrice(''), '');
  assert.equal(formatPrice(undefined), '');
});

test('the order message names the product, option, quantity, price and page', () => {
  const text = message(whatsappOrderUrl({ title: 'Steel Kara & Box', url: '/sikh-store/steel-kara', fields: { price: 499 } }, { option: 'Medium', quantity: 2 }));
  for (const line of ['Product: Steel Kara & Box', 'Option: Medium', 'Quantity: 2', 'Price: ₹499 each', 'Link: https://www.sikhify.in/sikh-store/steel-kara']) assert.ok(text.includes(line), line);
});

test('an order without options leaves that line out', () => {
  assert.ok(!message(whatsappOrderUrl({ title: 'Gutka', fields: { price: 100 } })).includes('Option:'));
});

test('a product needs a category, price and availability, and the price cannot be negative', () => {
  const ok = { title: 'Steel Kara', category: 'Kara', price: '499', availability: 'In stock', variants: 'Small\nMedium' };
  const good = validateContent('product', ok);
  assert.deepEqual(good.errors, {});
  assert.equal(good.data.price, 499);
  assert.deepEqual(good.data.variants, ['Small', 'Medium']);
  assert.ok(validateContent('product', { ...ok, price: '-1' }).errors.price);
  assert.ok(validateContent('product', { title: 'Steel Kara' }).errors.availability);
  assert.equal(CONTENT_TYPES.product.fields.find((f) => f.kind === 'select').name, 'category', 'the first dropdown is the category filter');
});

test('image links that would not show on the site are refused with a reason', async () => {
  const { imageLinkProblem } = await import('../shared/contentTypes.js');
  assert.match(imageLinkProblem('http://example.com/a.jpg'), /https/);
  assert.match(imageLinkProblem('https://drive.google.com/file/d/abc/view'), /page/);
  assert.match(imageLinkProblem('https://www.instagram.com/p/abc/'), /page/);
  assert.equal(imageLinkProblem('https://upload.wikimedia.org/a.jpg'), '');
  const base = { title: 'Gurpurab', event_type: 'Gurpurab', start_date: '2026-11-24', venue: 'Gurdwara', city: 'Bhilai', official_source: 'https://www.sikhify.in' };
  assert.ok(validateContent('event', { ...base, image_url: 'https://photos.app.goo.gl/xyz' }).errors.image_url);
  assert.deepEqual(validateContent('event', { ...base, image_url: '/uploads/2026/11/' + 'a'.repeat(32) + '.webp' }).errors, {});
});
