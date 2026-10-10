/* ==========================================================================
   Festivals & Important Days — the admin dashboard and list. Tiles count
   published / draft / happening / upcoming records and those that need a
   verified date or have a broken destination; each tile filters the list.
   ========================================================================== */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminHeader, Pill, FilterBar, StatTile } from '../../components/admin/AdminKit.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { TextInput, Select } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { festivalDateLabel, festivalStatusLabel } from '../../utils/festivalCard.js';
import { SCHEDULE_TYPES, CATEGORIES, daysBetween } from '../../../../shared/festivals.js';
import { formatDate, relativeTime } from '../../utils/format.js';

const VIEWS = [
  { value: 'ongoing', label: 'Happening now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'needs_verification', label: 'Needs a verified date' },
  { value: 'invalid_destination', label: 'Broken destination' },
  { value: 'home', label: 'On the homepage' },
  { value: 'featured', label: 'Featured' },
];

/** What still needs doing before a record shows correctly. */
export function gapLabel(gaps) {
  return gaps.map((g) => (g === 'rule' ? 'fixed date not verified' : g === 'date' ? 'date not verified' : `${g} not verified`)).join(', ');
}

export default function FestivalsList() {
  usePageMeta('Festivals & Important Days — Sikhify Admin', undefined, { noindex: true });
  const [params, setParams] = useSearchParams();
  const f = { status: params.get('status') || '', category: params.get('category') || '', view: params.get('view') || '', q: params.get('q') || '', page: Number(params.get('page')) || 1 };
  const [q, setQ] = useState(f.q);
  const update = (patch) => {
    // A filter change starts again at page 1 (an empty value drops the parameter).
    const next = { ...f, page: '', ...patch };
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
  };
  const state = useAsync(() => adminService.festivals(f), [params.toString()]);
  const filtered = f.status || f.category || f.view || f.q;

  return (
    <>
      <AdminHeader title="Festivals & Important Days"
        sub="Gurpurabs, Shaheedi Purabs and other observances shown on the homepage and at /festivals. A date appears publicly only when it is marked verified with a source."
        actions={<><a className="sk-btn" href="/festivals" target="_blank" rel="noopener noreferrer">View live ↗</a><Link className="sk-btn sk-btn-gold" to="/admin/festivals/new"><Icon name="plus" size={16} />New observance</Link></>} />
      {state.data ? (
        <>
          <div className="sk-grid sk-grid-4">
            <StatTile label="Published" value={state.data.stats.published} to="/admin/festivals?status=published" />
            <StatTile label="Drafts" value={state.data.stats.draft} to="/admin/festivals?status=draft" />
            <StatTile label="Happening now" value={state.data.stats.ongoing} to="/admin/festivals?view=ongoing" note="published" />
            <StatTile label="Upcoming" value={state.data.stats.upcoming} to="/admin/festivals?view=upcoming" note="published" />
            <StatTile label="Need a verified date" value={state.data.stats.needsVerification} to="/admin/festivals?view=needs_verification" note="this year or next" />
            {state.data.stats.invalidDestination ? <StatTile label="Broken destinations" value={state.data.stats.invalidDestination} to="/admin/festivals?view=invalid_destination" /> : null}
          </div>
          <div className="sk-note" role="status">
            <Icon name="calendar" size={18} />
            <p>Today is <strong>{formatDate(state.data.today, { weekday: 'long' })}</strong> ({state.data.timeZone}). Dates that change every year must be entered and verified for each year — the previous year&apos;s date is never reused.</p>
          </div>
        </>
      ) : null}
      <FilterBar>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); update({ q }); }}>
          <TextInput label="Search" placeholder="Name or address" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="sk-btn">Search</button>
        </form>
        <Select label="Status" value={f.status} placeholder="Any status" options={['draft', 'published']} onChange={(e) => update({ status: e.target.value })} />
        <Select label="Category" value={f.category} placeholder="Any category" options={Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))} onChange={(e) => update({ category: e.target.value })} />
        <Select label="Show" value={f.view} placeholder="Everything" options={VIEWS} onChange={(e) => update({ view: e.target.value })} />
        {filtered ? <button type="button" className="sk-link-btn" onClick={() => { setQ(''); setParams({}, { replace: true }); }}>Clear</button> : null}
      </FilterBar>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead><tr><th scope="col">Observance</th><th scope="col">Next verified date</th><th scope="col">Schedule</th><th scope="col">Needs attention</th><th scope="col">Status</th><th scope="col">Last change</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {d.items.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.title}</strong>
                        <span className="sk-card-meta block">{CATEGORIES[o.category] || CATEGORIES.other} · /{o.slug}{o.featured ? ' · featured' : ''}{o.showOnHome ? '' : ' · hidden from homepage'}{o.priority ? ` · priority ${o.priority}` : ''}</span>
                      </td>
                      <td>{o.next ? <>{festivalDateLabel(o.next.start, o.next.end)}<span className="sk-card-meta block">{festivalStatusLabel({ ...o.next, daysUntil: Math.max(0, daysBetween(d.today, o.next.start)) })}</span></> : <span className="sk-card-meta">None verified</span>}</td>
                      <td>{SCHEDULE_TYPES[o.scheduleType]}</td>
                      <td>
                        {o.verificationGaps.length ? <span className="sk-pill sk-pill-pending">{gapLabel(o.verificationGaps)}</span> : null}
                        {o.destinationError ? <span className="sk-pill sk-pill-rejected" title={o.destinationError}>destination</span> : null}
                        {!o.verificationGaps.length && !o.destinationError ? <span className="sk-card-meta">—</span> : null}
                      </td>
                      <td><Pill value={o.status} /></td>
                      <td>{relativeTime(o.updatedAt)}</td>
                      <td><Link className="sk-btn sk-btn-sm" to={`/admin/festivals/${o.id}`}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setParams({ ...Object.fromEntries(params), page: String(page) }, { replace: true })} />
          </>
        ) : (
          <Empty icon="calendar" title={filtered ? 'Nothing matches' : 'No observances yet'} text="Add Gurpurabs and other important days with dates checked against a named source.">
            <Link className="sk-btn sk-btn-gold sk-btn-sm" to="/admin/festivals/new">New observance</Link>
          </Empty>
        ))}
      </AsyncView>
    </>
  );
}
