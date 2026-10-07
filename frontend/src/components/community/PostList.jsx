import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import PostCard from './PostCard.jsx';
import { Loading, ErrorState, Empty } from '../ui/States.jsx';
import { postService } from '../../services/community/index.js';

/**
 * A paginated list of posts for one feed scope (feed · discover · saved ·
 * group:<id> · user:<username>). Parents can prepend a newly created post via ref.
 */
const PostList = forwardRef(function PostList({ scope, empty }, ref) {
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [state, setState] = useState({ loading: true, error: null, more: false });

  const load = useCallback((cursor) => {
    setState((s) => ({ ...s, loading: !cursor, more: !!cursor, error: null }));
    return postService.list(scope, cursor || {})
      .then((res) => {
        setItems((prev) => (cursor ? [...prev, ...res.items.filter((p) => !prev.some((x) => x.id === p.id))] : res.items));
        setNext(res.next);
        setState({ loading: false, error: null, more: false });
      })
      .catch((error) => setState({ loading: false, error, more: false }));
  }, [scope]);

  useEffect(() => { setItems([]); load(); }, [load]);
  useImperativeHandle(ref, () => ({ prepend: (post) => setItems((prev) => [post, ...prev]), reload: () => load() }), [load]);

  if (state.loading) return <Loading rows={3} label="Loading posts…" />;
  if (state.error && !items.length) return <ErrorState error={state.error} title="Posts couldn't be loaded" onRetry={() => load()} />;
  if (!items.length) return empty || <Empty title="No posts yet" text="Nothing has been shared here yet." icon="message" />;
  return (
    <div className="sk-stack">
      {items.map((p) => <PostCard key={p.id} post={p} onRemoved={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} />)}
      {state.error ? <ErrorState error={state.error} title="More posts couldn't be loaded" onRetry={() => load(next)} /> : null}
      {next ? (
        <div className="flex justify-center">
          <button type="button" className="sk-btn" disabled={state.more} onClick={() => load(next)}>{state.more ? 'Loading…' : 'Load more'}</button>
        </div>
      ) : <p className="sk-card-meta text-center">You&apos;re all caught up.</p>}
    </div>
  );
});

export default PostList;
