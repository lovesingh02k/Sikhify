/* All Hukamnama records: search, filter by status and date range, open to edit. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, Pill, FilterBar } from '../../components/admin/AdminKit.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { TextInput, Select } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { formatDate, relativeTime } from '../../utils/format.js';

export default function HukamnamaList() {
  usePageMeta('Hukamnama — Sikhify Admin', undefined, { noindex: true });
  const [f, setF] = useState({ status: '', from: '', to: '', q: '', page: 1 });
  const [q, setQ] = useState('');
  const state = useAsync(() => adminService.hukamnamas(f), [JSON.stringify(f)]);
  const today = state.data && state.data.today;
  const todays = state.data && state.data.items.find((h) => h.date === today && h.status === 'published');

  return (
    <>
      <AdminHeader title="Daily Hukamnama"
        sub="The published record for a date is what the homepage and the Hukamnama page show. With no published record, the site shows the live BaniDB Hukamnama."
        actions={<Link className="sk-btn sk-btn-gold" to={`/admin/hukamnama/new${today ? `?date=${today}` : ''}`}><Icon name="plus" size={16} />New Hukamnama</Link>} />
      {today ? (
        <div className="sk-note" role="status">
          <Icon name="calendar" size={18} />
          <p>Today in India is <strong>{formatDate(today, { weekday: 'long' })}</strong>. {todays
            ? <>A Sikhify Hukamnama is published for today (<Link className="panel-view-all" to={`/admin/hukamnama/${todays.id}`}>open it</Link>).</>
            : <>No Sikhify record is published for today in this list{f.status || f.from || f.to || f.q ? ' (filters are on)' : ''} — visitors see the BaniDB Hukamnama.</>}</p>
        </div>
      ) : null}
      <FilterBar>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q, page: 1 }); }}>
          <TextInput label="Search" placeholder="Gurmukhi, words, Raag, Ang…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="sk-btn">Search</button>
        </form>
        <Select label="Status" value={f.status} placeholder="Any status" options={['draft', 'published', 'archived']} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} />
        <TextInput label="From" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} />
        <TextInput label="To" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} />
        {f.status || f.from || f.to || f.q ? <button type="button" className="sk-link-btn" onClick={() => { setQ(''); setF({ status: '', from: '', to: '', q: '', page: 1 }); }}>Clear</button> : null}
      </FilterBar>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead><tr><th scope="col">Date</th><th scope="col">Ang</th><th scope="col">Opening line</th><th scope="col">Status</th><th scope="col">Last change</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {d.items.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{formatDate(h.date, { weekday: 'short' })}</strong>{h.date === d.today ? <span className="sk-badge ml-1">Today</span> : null}</td>
                      <td>{h.ang || '—'}</td>
                      <td><span className="sk-clip font-gurmukhi" lang="pa">{(h.gurmukhi.split('\n').find((l) => l.trim()) || '').trim() || '—'}</span></td>
                      <td><Pill value={h.status} /></td>
                      <td>{relativeTime(h.updatedAt)}{h.updatedBy ? <span className="sk-card-meta block">{h.updatedBy}</span> : null}</td>
                      <td><Link className="sk-btn sk-btn-sm" to={`/admin/hukamnama/${h.id}`}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : (
          <Empty icon="book" title={f.status || f.from || f.to || f.q ? 'No Hukamnamas match' : 'No Hukamnama records yet'} text="Until a record is published, the site shows the live BaniDB Hukamnama.">
            <Link className="sk-btn sk-btn-gold sk-btn-sm" to={`/admin/hukamnama/new${d.today ? `?date=${d.today}` : ''}`}>Add today&apos;s Hukamnama</Link>
          </Empty>
        ))}
      </AsyncView>
    </>
  );
}
