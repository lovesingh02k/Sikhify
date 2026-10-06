import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks loading / data / error, re-running when
 * `deps` change. Stale responses (after deps changed) are ignored.
 * Returns { data, error, loading, reload, setData }.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  const run = useRef(0);

  const load = useCallback(() => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(loader)
      .then((data) => { if (id === run.current) setState({ data, error: null, loading: false }); })
      .catch((error) => { if (id === run.current) setState({ data: undefined, error, loading: false }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: load, setData };
}
