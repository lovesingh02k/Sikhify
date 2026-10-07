/* Directory records (all types, or one type for /admin/gurdwaras, /admin/events, …). */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, Pill, FilterBar } from '../../components/admin/AdminKit.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { TextInput, Select } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { CONTENT_TYPES, PUBLISH_STATUSES, VERIFICATION_STATUSES, VERIFICATION_LABELS } from '../../../../shared/contentTypes.js';
import { relativeTime, formatDate } from '../../utils/format.js';

export default function Content({ type: fixedType }) {
  const t = fixedType ? CONTENT_TYPES[fixedType] : null;
  usePageMeta(`${t ? t.plural : 'Content'} — Sikhify Admin`, undefined, { noindex: true });
  const [f, setF] = useState({ type: fixedType || '', status: '', verification: '', q: '', page: 1 });
  const [q, setQ] = useState('');
  const query = { ...f, type: fixedType || f.type };
  const state = useAsync(() => adminService.entries(query), [JSON.stringify(query)]);
  const newType = fixedType || f.type || '';

  return (
    <>
      <AdminHeader title={t ? t.plural : 'All content'} sub={t ? t.description : 'Every directory record: Gurdwaras, events, personalities, organizations, websites, apps, books, heritage, news and kids resources.'}
        actions={<Link className="sk-btn sk-btn-gold" to={`/admin/content/new${newType ? `?type=${newType}` : ''}`}><Icon name="plus" size={16} />New {t ? t.label.toLowerCase() : 'record'}</Link>} />
      <FilterBar>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setF({ ...f, q, page: 1 }); }}>
          <TextInput label="Search" placeholder="Title, city…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="sk-btn">Search</button>
        </form>
        {!fixedType ? <Select label="Type" value={f.type} placeholder="All types" options={Object.entries(CONTENT_TYPES).map(([value, x]) => ({ value, label: x.plural }))} onChange={(e) => setF({ ...f, type: e.target.value, page: 1 })} /> : null}
        <Select label="Publishing" value={f.status} placeholder="Any" options={PUBLISH_STATUSES} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} />
        <Select label="Verification" value={f.verification} placeholder="Any" options={VERIFICATION_STATUSES.map((v) => ({ value: v, label: VERIFICATION_LABELS[v] }))} onChange={(e) => setF({ ...f, verification: e.target.value, page: 1 })} />
      </FilterBar>
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead><tr><th scope="col">Title</th>{!fixedType ? <th scope="col">Type</th> : null}<th scope="col">Place / date</th><th scope="col">Publishing</th><th scope="col">Verification</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {d.items.map((e) => (
                    <tr key={e.id}>
                      <td><Link to={`/admin/content/${e.id}`}>{e.title}</Link>{e.category ? <span className="sk-card-meta block">{e.category}</span> : null}</td>
                      {!fixedType ? <td>{CONTENT_TYPES[e.type].label}</td> : null}
                      <td>{[e.city, e.country].filter(Boolean).join(', ')}{e.date ? <span className="block">{formatDate(e.date)}</span> : null}</td>
                      <td><Pill value={e.publishStatus} /></td>
                      <td><Pill value={e.verification.status} label={VERIFICATION_LABELS[e.verification.status]} /></td>
                      <td>{relativeTime(e.verification.updatedAt)}{e.updatedBy ? <span className="sk-card-meta block">{e.updatedBy}</span> : null}</td>
                      <td><div className="flex gap-1"><Link className="sk-btn sk-btn-sm" to={`/admin/content/${e.id}`}>Edit</Link>{e.publishStatus === 'published' ? <Link className="sk-btn sk-btn-sm" to={e.url}>View</Link> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pages={d.pages} onPage={(page) => setF({ ...f, page })} />
          </>
        ) : (
          <Empty icon="globe" title={`No ${t ? t.plural.toLowerCase() : 'records'} yet`} text="Add one with its source, or approve a community submission.">
            <Link className="sk-btn sk-btn-gold sk-btn-sm" to={`/admin/content/new${newType ? `?type=${newType}` : ''}`}>New {t ? t.label.toLowerCase() : 'record'}</Link>
            <Link className="sk-btn sk-btn-sm" to="/admin/submissions">Review submissions</Link>
          </Empty>
        ))}
      </AsyncView>
    </>
  );
}
