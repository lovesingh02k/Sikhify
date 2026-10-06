import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import GroupCard from '../../components/community/GroupCard.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { AsyncView, Empty, Loading } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { groupService } from '../../services/community/index.js';
import { GROUP_CATEGORIES } from '../../../shared/community.js';

export default function Groups() {
  useReactPage('Groups — Community — Sikhify.in', 'Join Sikhify community groups for Seva, Gurmat study, youth, Kirtan, local Sangat and more.');
  const { user, can } = useAuth();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const [q, setQ] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(q);
  useEffect(() => { const id = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(id); }, [q]);
  const all = useAsync(() => groupService.list({ q: debounced, category }), [debounced, category]);
  const mine = useAsync(() => (user ? groupService.list({ mine: 1 }) : []), [user && user.id]);

  const setCategory = (c) => { const n = new URLSearchParams(params); if (c) n.set('category', c); else n.delete('category'); setParams(n); };

  return (
    <CommunityLayout title="Groups" sub="Find your Sangat — Seva, Gurmat study, youth, Kirtan, local communities and more.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="sk-field">
          <Icon name="search" />
          <label className="sr-only" htmlFor="group-q">Search groups</label>
          <input id="group-q" className="sk-input" type="search" autoComplete="off" placeholder="Search groups…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {can('group.create') ? <Link className="sk-btn sk-btn-gold" to="/community/groups/new"><Icon name="plus" size={16} />Create a group</Link> : null}
      </div>
      <div className="sk-chip-row" role="group" aria-label="Filter by category">
        <button type="button" className="sk-chip" aria-pressed={!category} onClick={() => setCategory('')}>All</button>
        {GROUP_CATEGORIES.map((c) => <button key={c} type="button" className="sk-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
      </div>

      {user && mine.data && mine.data.length && !debounced && !category ? (
        <section aria-labelledby="my-groups">
          <h2 className="sk-section-title" id="my-groups">Your groups</h2>
          <ul className="sk-grid sk-grid-2 mt-4" role="list">{mine.data.map((g) => <li key={g.id}><GroupCard group={g} /></li>)}</ul>
        </section>
      ) : null}

      <section aria-labelledby="all-groups">
        <h2 className="sk-section-title" id="all-groups">{debounced || category ? 'Matching groups' : 'All groups'}</h2>
        <div className="mt-4">
          <AsyncView state={all} loading={<Loading rows={2} />}>
            {(list) => (list.length ? (
              <ul className="sk-grid sk-grid-2" role="list">{list.map((g) => <li key={g.id}><GroupCard group={g} /></li>)}</ul>
            ) : (
              <Empty icon="users" title={debounced || category ? 'No groups match' : 'No groups yet'} text={debounced || category ? 'Try another word or category.' : 'Start the first group for your Sangat.'}>
                {can('group.create') ? <Link className="sk-btn sk-btn-gold sk-btn-sm" to="/community/groups/new">Create a group</Link>
                  : !user ? <Link className="sk-btn sk-btn-sm" to="/login?next=%2Fcommunity%2Fgroups%2Fnew">Sign in to create a group</Link> : null}
              </Empty>
            ))}
          </AsyncView>
        </div>
      </section>
    </CommunityLayout>
  );
}
