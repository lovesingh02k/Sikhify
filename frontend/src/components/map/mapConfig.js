/* ==========================================================================
   Map provider configuration (environment variables, read at build time).
     VITE_MAP_PROVIDER       "leaflet" (default) or "none" (hide interactive maps;
                             "Open in Maps" links still work)
     VITE_MAP_TILE_URL       tile template (default: OpenStreetMap standard tiles)
     VITE_MAP_ATTRIBUTION    attribution HTML required by the tile provider
   OpenStreetMap's public tiles are fine for modest traffic (see their tile usage
   policy); for heavy production use, point VITE_MAP_TILE_URL at a hosted tile
   service (with its key in the URL if it needs one).
   ========================================================================== */
const env = import.meta.env || {};

export const MAP_CONFIG = {
  provider: env.VITE_MAP_PROVIDER === 'none' ? 'none' : 'leaflet',
  tileUrl: env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

export const mapsEnabled = () => MAP_CONFIG.provider !== 'none';
