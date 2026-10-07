/* ==========================================================================
   MapView — the map provider abstraction used by every page.
   The map library (and its CSS) is downloaded only when a MapView renders,
   never with the rest of the site. Shows a skeleton while loading, and an
   honest fallback when maps are disabled (VITE_MAP_PROVIDER=none) or fail.
   ========================================================================== */
import { Component, lazy, Suspense } from 'react';
import Icon from '../ui/Icon.jsx';
import { mapsEnabled } from './mapConfig.js';

const LeafletMap = lazy(() => import('./LeafletMap.jsx'));

class MapBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Unavailable({ height, children }) {
  return (
    <div className="sk-map sk-map-off" style={{ height }} role="note">
      <Icon name="map" size={26} />
      <p>The map isn&apos;t available right now.</p>
      {children}
    </div>
  );
}

export default function MapView(props) {
  const height = props.height || 320;
  if (!mapsEnabled()) return <Unavailable height={height}>{props.fallbackAction}</Unavailable>;
  return (
    <MapBoundary fallback={<Unavailable height={height}>{props.fallbackAction}</Unavailable>}>
      <Suspense fallback={<div className="sk-map sk-skeleton" style={{ height }} role="status" aria-label="Loading map" />}>
        <LeafletMap {...props} height={height} />
      </Suspense>
    </MapBoundary>
  );
}
