/* ==========================================================================
   Browser geolocation for "Gurdwaras Near Me".
   The position is kept in memory only (shared across directory pages while
   the tab is open) — never written to storage, never saved on the server.
   status: idle · locating · active · denied · unavailable · error
   ========================================================================== */
import { useCallback, useEffect, useState } from 'react';

let current = { status: 'idle', coords: null };
const listeners = new Set();
const set = (next) => { current = next; listeners.forEach((fn) => fn(current)); };

export function useGeolocation() {
  const [state, setState] = useState(current);
  useEffect(() => { listeners.add(setState); return () => listeners.delete(setState); }, []);

  const request = useCallback(() => new Promise((resolve) => {
    if (!('geolocation' in navigator)) { set({ status: 'unavailable', coords: null }); resolve(null); return; }
    set({ status: 'locating', coords: current.coords });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Rounded to ~100 m: precise enough to sort by distance.
        const coords = { lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 };
        set({ status: 'active', coords });
        resolve(coords);
      },
      (err) => { set({ status: err.code === 1 ? 'denied' : 'error', coords: null }); resolve(null); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }), []);
  const clear = useCallback(() => set({ status: 'idle', coords: null }), []);
  return { ...state, request, clear };
}
