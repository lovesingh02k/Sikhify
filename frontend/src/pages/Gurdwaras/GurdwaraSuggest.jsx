/* ==========================================================================
   /directory/gurdwaras/suggest — suggest a missing Gurdwara, or an update to
   an existing one (?update=country/state/city/slug). Every suggestion goes to
   the review queue as PENDING; nothing is published until the Sikhify team
   has checked it. Members can follow their suggestions here (#mine) and
   resubmit when the team asks for changes.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { TextInput, TextArea, Select, FormError } from '../../components/ui/Form.jsx';
import { Loading, Empty, ErrorState, ServiceUnavailable } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { formatDate } from '../../utils/format.js';

const SUB_STATUS = {
  pending: { label: 'Pending review', cls: 'pending' },
  changes_requested: { label: 'Changes requested', cls: 'needs_review' },
  approved: { label: 'Approved', cls: 'verified' },
  rejected: { label: 'Not accepted', cls: 'rejected' },
};
const EMPTY = { name: '', country: '', state: '', city: '', address: '', website: '', phone: '', details: '', source: '' };

function SuggestionFields({ form, setForm, fields, countries, kind }) {
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isNew = kind === 'new';
  return (
    <div className="sk-form-grid">
      {isNew ? (
        <>
          <TextInput className="sk-span-2" label="Gurdwara name" required value={form.name} onChange={on('name')} error={fields.name} maxLength={200} autoComplete="off"
            help="As it is written at the Gurdwara or on its official website, e.g. “Gurdwara Singh Sabha”." />
          <Select label="Country" required value={form.country} onChange={on('country')} error={fields.country} placeholder="Choose a country…"
            options={(countries || []).map((c) => ({ value: c.code || c.name, label: c.name }))} />
          <TextInput label="State / Province / Region" required value={form.state} onChange={on('state')} error={fields.state} maxLength={100} />
          <TextInput label="City / Town" required value={form.city} onChange={on('city')} error={fields.city} maxLength={100} />
        </>
      ) : null}
      <TextInput className={isNew ? '' : 'sk-span-2'} label={isNew ? 'Address' : 'Correct address (if it changed)'} value={form.address} onChange={on('address')} error={fields.address} maxLength={500} />
      <TextInput label="Website" type="url" inputMode="url" placeholder="https://" value={form.website} onChange={on('website')} error={fields.website} maxLength={300} />
      <TextInput label="Phone" type="tel" value={form.phone} onChange={on('phone')} error={fields.phone} maxLength={60} help="The Gurdwara’s public number only." />
      <TextArea className="sk-span-2" label={isNew ? 'Additional information' : 'What should be updated?'} required={!isNew} rows={5} value={form.details} onChange={on('details')} error={fields.details} maxLength={5000}
        help={isNew ? 'Langar timings, facilities, programs, landmarks — anything that helps us check the listing.' : 'For example new timings, a changed phone number, or that the Gurdwara has moved or closed.'} />
      <TextInput className="sk-span-2" label="Source / Reference" required value={form.source} onChange={on('source')} error={fields.source} maxLength={500}
        help="Where does this come from? The Gurdwara’s website or social page, a committee notice, a Sikh organisation’s listing… Please don’t guess addresses or phone numbers." />
    </div>
  );
}

function MySuggestions({ refreshKey, countries }) {
  const state = useAsync(() => gurdwaraService.mySuggestions(), [refreshKey]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (state.loading && !state.data) return <Loading rows={1} />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data.length) return <p className="sk-card-meta">You haven&apos;t suggested anything yet.</p>;

  const startEdit = (s) => { setEditing(s.id); setFields({}); setError(null); setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] || ''])) }); };
  async function resubmit(e, s) {
    e.preventDefault();
    setBusy(true); setError(null); setFields({});
    try {
      const updated = await gurdwaraService.resubmit(s.id, form);
      state.setData((list) => list.map((x) => (x.id === s.id ? updated : x)));
      setEditing(null);
    } catch (err) { setError(err); setFields(err.fields || {}); } finally { setBusy(false); }
  }

  return (
    <ul className="flex flex-col gap-3">
      {state.data.map((s) => {
        const st = SUB_STATUS[s.status] || SUB_STATUS.pending;
        return (
          <li key={s.id} className="sk-card" style={{ padding: '1rem' }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`sk-pill sk-pill-${st.cls}`}>{st.label}</span>
              <span className="sk-card-meta" style={{ marginTop: 0 }}>{s.kind === 'update' ? 'Update' : 'New Gurdwara'} · sent {formatDate(s.createdAt)}</span>
            </div>
            <p className="sk-card-title mt-2" style={{ fontSize: '0.95rem' }}>{s.name}{s.city ? <span className="sk-card-meta" style={{ marginTop: 0 }}> — {[s.city, s.state].filter(Boolean).join(', ')}</span> : null}</p>
            {s.reviewNote ? <p className="sk-card-text"><strong>Reviewer&apos;s note:</strong> {s.reviewNote}</p> : null}
            {s.status === 'pending' ? <p className="sk-card-meta">Waiting for review.</p> : null}
            {s.status === 'approved' && s.resultUrl ? <Link className="sk-link-btn mt-2" to={s.resultUrl}>View the listing →</Link> : null}
            {s.status === 'changes_requested' && editing !== s.id ? <button type="button" className="sk-btn sk-btn-sm mt-3" onClick={() => startEdit(s)}><Icon name="edit" size={14} />Update and resubmit</button> : null}
            {editing === s.id ? (
              <form className="sk-form mt-4" onSubmit={(e) => resubmit(e, s)} noValidate>
                <FormError error={error} />
                <SuggestionFields form={form} setForm={setForm} fields={fields} countries={countries} kind={s.kind} />
                <div className="sk-form-actions">
                  <button type="submit" className="sk-btn sk-btn-gold sk-btn-sm" disabled={busy}>{busy ? 'Sending…' : 'Resubmit for review'}</button>
                  <button type="button" className="sk-btn sk-btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function GurdwaraSuggest() {
  const { user, status } = useAuth();
  const [params] = useSearchParams();
  const updatePath = params.get('update') || '';
  const kind = updatePath ? 'update' : 'new';
  useReactPage(kind === 'update' ? 'Suggest an Update — Gurdwara Directory | Sikhify' : 'Suggest a Gurdwara | Sikhify',
    'Help grow the Sikhify Global Gurdwara Directory: suggest a missing Gurdwara or an update. Every suggestion is checked before it is published.');

  const target = useAsync(() => (updatePath ? gurdwaraService.detail(...updatePath.split('/').slice(0, 4)) : null), [updatePath]);
  const countries = useAsync(() => gurdwaraService.countries(), []);
  const [form, setForm] = useState(EMPTY);
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { if (window.location.hash === '#mine') setTimeout(() => document.getElementById('mine')?.scrollIntoView(), 300); }, [user]);

  const g = target.data && target.data.gurdwara;
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null); setFields({});
    try {
      const res = await gurdwaraService.suggest({ ...form, kind, gurdwaraId: g ? g.id : undefined });
      setSent(res);
      setRefreshKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err); setFields(err.fields || {});
      const first = err.fields && Object.keys(err.fields)[0];
      if (first) setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0);
    } finally { setBusy(false); }
  }

  const next = encodeURIComponent(window.location.pathname + window.location.search);
  let body;
  if (status === 'loading') body = <Loading rows={2} />;
  else if (status === 'unavailable') body = <ServiceUnavailable />;
  else if (!user) {
    body = (
      <Empty icon="lock" title="Sign in to suggest a Gurdwara" text="Suggestions are linked to your account so our team can follow up, and you can see what happened to each one.">
        <Link className="sk-btn sk-btn-gold sk-btn-sm" to={`/login?next=${next}`}>Sign in</Link>
        <Link className="sk-btn sk-btn-sm" to={`/signup?next=${next}`}>Create an account</Link>
      </Empty>
    );
  } else if (updatePath && target.error) {
    body = <ErrorState error={target.error} title="That Gurdwara couldn’t be found"><Link className="sk-btn sk-btn-sm" to="/directory/gurdwaras/suggest">Suggest a new Gurdwara instead</Link></ErrorState>;
  } else if (updatePath && !g) body = <Loading rows={2} />;
  else {
    body = (
      <div className="sk-gsuggest-layout">
        <div className="sk-stack">
          {sent ? (
            <div className="sk-card">
              <p className="sk-form-success" role="status"><strong>Thank you — your suggestion was received.</strong> It&apos;s now <strong>pending review</strong> and won&apos;t appear in the directory until our team has checked it. You&apos;ll get a notification when it has been reviewed.</p>
              {sent.possibleExisting && sent.possibleExisting.length ? (
                <div className="sk-notice mt-4" role="note">
                  <p><strong>Is it one of these?</strong> These verified listings look similar — if yours is already here, there&apos;s nothing more to do.</p>
                  <ul className="mt-2 flex flex-col gap-1">{sent.possibleExisting.map((p) => <li key={p.url}><Link className="sk-link-btn" to={p.url}>{p.name}, {p.city}</Link></li>)}</ul>
                </div>
              ) : null}
              <div className="sk-form-actions mt-4">
                <button type="button" className="sk-btn sk-btn-sm" onClick={() => { setSent(null); setForm(EMPTY); }}>Suggest another</button>
                <a className="sk-btn sk-btn-sm" href="#mine">See my suggestions</a>
                <Link className="sk-btn sk-btn-sm" to="/directory/gurdwaras">Back to the directory</Link>
              </div>
            </div>
          ) : (
            <form className="sk-card sk-form" onSubmit={submit} noValidate aria-labelledby="form-h">
              <h2 className="sk-card-title" id="form-h">{g ? <>Suggest an update for <Link to={g.url}>{g.name}</Link></> : 'Gurdwara details'}</h2>
              {g ? <p className="sk-card-meta">{[g.city.name, g.state.name, g.country.name].join(', ')}</p> : null}
              <FormError error={error} />
              <SuggestionFields form={form} setForm={setForm} fields={fields} countries={countries.data} kind={kind} />
              {countries.error ? <p className="sk-form-error">The country list couldn&apos;t be loaded — please reload the page.</p> : null}
              <div className="sk-form-actions">
                <button type="submit" className="sk-btn sk-btn-gold" disabled={busy}>{busy ? 'Sending…' : 'Send for review'}</button>
                <span className="sk-card-meta" style={{ marginTop: 0 }}>Checked by the Sikhify team before anything is published.</span>
              </div>
            </form>
          )}
          <section id="mine" className="sk-card" aria-labelledby="mine-title">
            <h2 className="sk-card-title" id="mine-title">My suggestions</h2>
            <div className="mt-3"><MySuggestions refreshKey={refreshKey} countries={countries.data} /></div>
          </section>
        </div>
        <aside className="sk-card" aria-labelledby="how">
          <h2 className="sk-card-title" id="how">How review works</h2>
          <ol className="mt-3 flex flex-col gap-3 sk-card-text">
            <li><strong>1. Pending.</strong> Your suggestion joins the review queue — it is not public.</li>
            <li><strong>2. Checked.</strong> Our team compares it with existing listings and checks it against your source.</li>
            <li><strong>3. Published, or a note back.</strong> Approved listings are added to the directory; if we need more information, you can update your suggestion here.</li>
          </ol>
          <p className="sk-note mt-4"><Icon name="shield" size={16} /><span>Only information from reliable sources is marked as verified.</span></p>
        </aside>
      </div>
    );
  }

  return (
    <main id="main-content" className="sk-gdir">
      <section className="page-hero sk-ghero sk-ghero-compact" aria-labelledby="page-title">
        <div className="sk-container relative z-10">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <ol>
              <li><Link to="/directory/gurdwaras">Gurdwaras</Link></li>
              <li><span aria-current="page">{kind === 'update' ? 'Suggest an Update' : 'Suggest a Gurdwara'}</span></li>
            </ol>
          </nav>
          <h1 key={kind} className="page-hero-title" id="page-title">{kind === 'update' ? <>Suggest an <span className="gold">update</span></> : <>Suggest a <span className="gold">Gurdwara</span></>}</h1>
          <p className="page-hero-sub">{kind === 'update' ? 'Help keep this listing accurate.' : 'Can’t find a Gurdwara? Help us grow the directory.'}</p>
        </div>
      </section>
      <div className="sk-container sk-gsection">{body}</div>
    </main>
  );
}
