import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import PostList from '../../components/community/PostList.jsx';
import GroupCard from '../../components/community/GroupCard.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { Empty, Loading, ErrorState } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { groupService, userService } from '../../services/community/index.js';

function MemberSearch() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState({ items: null, error: null });
  useEffect(() => {
    if (q.trim().length < 2) { setRes({ items: null, error: null }); return undefined; }
    // `current` is cleared when the query changes, so a slower answer to an older query can't replace newer results.
    let current = true;
    const id = setTimeout(() => userService.search(q.trim())
      .then((items) => { if (current) setRes({ items, error: null }); })
      .catch((error) => { if (current) setRes({ items: null, error }); }), 250);
    return () => { current = false; clearTimeout(id); };
  }, [q]);
  return (
    <section className="sk-card" aria-labelledby="find-members">
      <h2 className="sk-card-title" id="find-members">Find members</h2>
      <div className="sk-field mt-3" style={{ maxWidth: 'none' }}>
        <Icon name="search" />
        <label className="sr-only" htmlFor="member-q">Search members by name or username</label>
        <input id="member-q" className="sk-input" type="search" autoComplete="off" placeholder="Name or username…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {res.error ? <p className="sk-form-error">{res.error.message}</p> : null}
      {res.items ? (res.items.length ? (
        <ul className="flex flex-col gap-2 mt-3">
          {res.items.map((u) => (
            <li key={u.id}><Link className="flex items-center gap-3" to={`/community/profile/${u.username}`}><Avatar user={u} size={34} /><span><span className="sk-post-author block">{u.name}</span><span className="sk-card-meta block" style={{ marginTop: 0 }}>@{u.username}</span></span></Link></li>
          ))}
        </ul>
      ) : <p className="sk-card-meta">No members match “{q}”.</p>) : <p className="sk-card-meta">Type at least two letters.</p>}
    </section>
  );
}

export default function Discover() {
  useReactPage('Discover — Community — Sikhify.in', 'Popular posts, groups and members in the Sikhify community.');
  const groups = useAsync(() => groupService.list(), []);
  return (
    <CommunityLayout title="Discover" sub="Popular posts from the last 30 days, active groups, and members of the Sangat.">
      <div className="sk-grid sk-grid-2">
        <MemberSearch />
        <section className="sk-card" aria-labelledby="popular-groups">
          <div className="flex items-center justify-between gap-2">
            <h2 className="sk-card-title" id="popular-groups">Active groups</h2>
            <Link className="panel-view-all" to="/community/groups">All groups →</Link>
          </div>
          {groups.loading ? <Loading rows={1} /> : groups.error ? <ErrorState error={groups.error} onRetry={groups.reload} /> : groups.data.length ? (
            <ul className="flex flex-col gap-2 mt-3">
              {groups.data.slice(0, 5).map((g) => (
                <li key={g.id}><Link className="flex justify-between gap-3" to={`/community/groups/${g.slug}`}><span className="sk-post-author">{g.name}</span><span className="sk-card-meta" style={{ marginTop: 0 }}>{g.memberCount} members</span></Link></li>
              ))}
            </ul>
          ) : <p className="sk-card-meta mt-3">No groups yet. <Link className="panel-view-all" to="/community/groups/new">Start one</Link></p>}
        </section>
      </div>
      <h2 className="sk-section-title mt-4">Popular posts</h2>
      <PostList scope="discover" empty={<Empty icon="compass" title="Nothing popular yet" text="Posts with reactions and comments from the last 30 days will appear here." />} />
      {groups.data && groups.data.length > 5 ? (
        <>
          <h2 className="sk-section-title mt-4">More groups</h2>
          <ul className="sk-grid sk-grid-2" role="list">{groups.data.slice(5, 11).map((g) => <li key={g.id}><GroupCard group={g} /></li>)}</ul>
        </>
      ) : null}
    </CommunityLayout>
  );
}
