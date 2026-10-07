/* ==========================================================================
   Leaflet implementation of the map provider (loaded on demand by MapView).
   Markers are HTML elements (divIcon) — no image assets, and they are
   keyboard-focusable: Tab to a marker, Enter opens its card.
   ========================================================================== */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from './mapConfig.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function icon(active, kind) {
  return L.divIcon({
    className: '',
    html: `<span class="sk-map-pin${active ? ' is-active' : ''}${kind === 'you' ? ' is-you' : ''}" aria-hidden="true"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

/**
 * points: [{ id, lat, lng, title, subtitle, status, href }]
 * you: { lat, lng } (visitor, optional) · selectedId · onSelect(id)
 * onOpen(href) navigates for a point's "View Details" · onPick({lat,lng}) enables click-to-place (admin)
 */
export default function LeafletMap({ points = [], you, selectedId, onSelect, onOpen, onPick, center, zoom = 12, height = 320, label = 'Map' }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const markers = useRef({});
  const cb = useRef({});
  cb.current = { onSelect, onOpen, onPick };

  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false, worldCopyJump: true, keyboard: true });
    L.tileLayer(MAP_CONFIG.tileUrl, { attribution: MAP_CONFIG.attribution, maxZoom: MAP_CONFIG.maxZoom }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on('click', (e) => { if (cb.current.onPick) cb.current.onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    // Popup "View Details" links navigate inside the app.
    m.on('popupopen', (e) => {
      const a = e.popup.getElement() && e.popup.getElement().querySelector('[data-open]');
      if (a) a.addEventListener('click', (ev) => { if (cb.current.onOpen) { ev.preventDefault(); cb.current.onOpen(a.getAttribute('href')); } });
    });
    map.current = m;
    m.setView([20, 0], 2);
    return () => { m.off(); m.stop(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    markers.current = {};
    const bounds = [];
    for (const p of points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const mk = L.marker([p.lat, p.lng], { icon: icon(p.id === selectedId), title: p.title, alt: p.title, keyboard: true, riseOnHover: true });
      if (p.href) {
        mk.bindPopup(`<div class="sk-map-card"><p class="sk-map-card-title">${esc(p.title)}</p>` +
          (p.subtitle ? `<p class="sk-map-card-sub">${esc(p.subtitle)}</p>` : '') +
          (p.status ? `<p class="sk-map-card-status">${esc(p.status)}</p>` : '') +
          `<a href="${esc(p.href)}" data-open>View Details →</a></div>`);
      }
      mk.on('click', () => { if (cb.current.onSelect) cb.current.onSelect(p.id); });
      mk.addTo(layer.current);
      markers.current[p.id] = mk;
      bounds.push([p.lat, p.lng]);
    }
    if (you && Number.isFinite(you.lat)) {
      L.marker([you.lat, you.lng], { icon: icon(false, 'you'), title: 'Your location', alt: 'Your location', keyboard: false, interactive: false }).addTo(layer.current);
      bounds.push([you.lat, you.lng]);
    }
    // No animation: an animated zoom that is still running when the map unmounts makes Leaflet throw.
    if (center) m.setView([center.lat, center.lng], zoom, { animate: false });
    else if (bounds.length === 1) m.setView(bounds[0], zoom, { animate: false });
    else if (bounds.length > 1) m.fitBounds(bounds, { padding: [28, 28], maxZoom: 14, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points.map((p) => [p.id, p.lat, p.lng])), you && you.lat, you && you.lng, center && center.lat, center && center.lng]);

  useEffect(() => {
    // Highlight only: popups open when a marker itself is clicked or activated with the keyboard.
    for (const [id, mk] of Object.entries(markers.current)) {
      const on = String(id) === String(selectedId);
      mk.setIcon(icon(on));
      mk.setZIndexOffset(on ? 1000 : 0);
    }
  }, [selectedId]);

  return <div ref={el} className="sk-map" style={{ height }} role="region" aria-label={label} />;
}
