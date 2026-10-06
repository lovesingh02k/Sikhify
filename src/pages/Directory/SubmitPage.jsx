/* ==========================================================================
   /submit — "Submit / Update Information".
   Members send new records (Gurdwara, event, personality, Kirtani/Jatha,
   website, app, book, organization), corrections, or reports of incorrect
   information. Everything goes to the review queue; nothing is published
   until a moderator or admin has checked it against its source.
   ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import SchemaFields from '../../components/common/SchemaFields.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { TextInput, TextArea, Select, FormError } from '../../components/ui/Form.jsx';
import { Loading, Empty, ErrorState, ServiceUnavailable } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { submissionService } from '../../services/content/contentService.js';
import { mediaService } from '../../services/media/mediaService.js';
import { SUBMISSION_KINDS } from '../../../shared/community.js';
import { formatDate } from '../../utils/format.js';

const KIND_KEYS = Object.keys(SUBMISSION_KINDS);

function MySubmissions({ refreshKey }) {
  const state = useAsync(() => submissionService.mine(), [refreshKey]);
  if (state.loading && !state.data) return <Loading rows={1} />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data.length) return <p className="sk-card-meta">You haven&apos;t sent anything yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {state.data.map((s) => (
        <li key={s.id} className="sk-card" style={{ padding: '1rem' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`sk-pill sk-pill-${s.status}`}>{s.status}</span>
            <span className="sk-card-meta" style={{ marginTop: 0 }}>{s.kindLabel} · sent {formatDate(s.createdAt)}</span>
          </div>
          <p className="sk-card-title mt-2" style={{ fontSize: '0.95rem' }}>{s.title || '(untitled)'}</p>
          {s.reviewNote ? <p className="sk-card-text"><strong>Reviewer&apos;s note:</strong> {s.reviewNote}</p> : null}
          {s.status === 'pending' ? <p className="sk-card-meta">Waiting for review.</p> : null}
        </li>
      ))}
    </ul>
  );
}

export default function SubmitPage() {
  useReactPage('Submit / Update Information — Sikhify.in', 'Add a Gurdwara, event, personality, Kirtani, website, app, book or organization to Sikhify, or correct existing information. Every submission is reviewed.');
  const { user, status } = useAuth();
  const [params, setParams] = useSearchParams();
  const kind = KIND_KEYS.includes(params.get('kind')) ? params.get('kind') : '';
  const def = SUBMISSION_KINDS[kind];
  const creates = def && def.creates;

  const [data, setData] = useState({});
  const [extra, setExtra] = useState({ source: '', message: '', targetUrl: params.get('target') || '', title: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const categories = useAsync(() => (kind === 'kirtani' ? mediaService.catalog().then((c) => c.categories) : []), [kind]);

  useEffect(() => { setData({}); setFields({}); setError(null); setSent(null); }, [kind]);
  useEffect(() => { if (window.location.hash === '#mine') document.getElementById('mine')?.scrollIntoView(); }, []);

  const chooseKind = (k) => { const n = new URLSearchParams(params); if (k) n.set('kind', k); else n.delete('kind'); setParams(n); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const payload = { kind, source: extra.source, message: extra.message };
      if (creates) payload.data = data;
      else { payload.targetUrl = extra.targetUrl; payload.title = extra.title; payload.targetEntryId = params.get('entry') || undefined; }
      const s = await submissionService.create(payload);
      setSent(s);
      setRefreshKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  const kindOptions = useMemo(() => KIND_KEYS.map((k) => ({ value: k, label: SUBMISSION_KINDS[k].label })), []);

  let body;
  if (status === 'loading') body = <Loading rows={2} />;
  else if (status === 'unavailable') body = <ServiceUnavailable />;
  else if (!user) {
    body = (
      <Empty icon="lock" title="Sign in to submit information" text="Submissions are linked to your account so reviewers can follow up, and you can see what happened to each one.">
        <Link className="sk-btn sk-btn-gold sk-btn-sm" to="/login?next=%2Fsubmit">Sign in</Link>
        <Link className="sk-btn sk-btn-sm" to="/signup?next=%2Fsubmit">Create an account</Link>
      </Empty>
    );
  } else {
    body = (
      <div className="sk-grid sk-grid-3" style={{ alignItems: 'start' }}>
        <div className="sk-stack" style={{ gridColumn: 'span 2 / span 2' }}>
          {sent ? (
            <div className="sk-card">
              <p className="sk-form-success" role="status"><strong>Thank you — your submission was received.</strong> It&apos;s now <strong>pending review</strong>. You&apos;ll get a notification when a reviewer has checked it.</p>
              <div className="sk-form-actions mt-4">
                <button type="button" className="sk-btn sk-btn-sm" onClick={() => { setSent(null); setData({}); setExtra({ ...extra, source: '', message: '' }); }}>Submit another</button>
                <a className="sk-btn sk-btn-sm" href="#mine">See my submissions</a>
              </div>
            </div>
          ) : (
            <form className="sk-card sk-form" onSubmit={submit} noValidate>
              <p className="sk-note" role="note"><Icon name="pin" size={16} /><span><strong>Adding or updating a Gurdwara?</strong> Use the <Link className="panel-view-all" to="/directory/gurdwaras/suggest">Suggest a Gurdwara</Link> form of the Global Gurdwara Directory.</span></p>
              <Select label="What are you sending?" required value={kind} options={kindOptions} placeholder="Choose…" onChange={(e) => chooseKind(e.target.value)} />
              {kind ? (
                <>
                  <FormError error={error} />
                  {creates && creates !== 'media_artist' ? <SchemaFields type={creates} values={data} onChange={setData} errors={fields} skip={['image_url']} /> : null}
                  {creates === 'media_artist' ? (
                    <div className="sk-form-grid">
                      <TextInput label="Name" required value={data.name || ''} onChange={(e) => setData({ ...data, name: e.target.value })} error={fields.name} />
                      <Select label="Category" required value={data.category || ''} placeholder="Choose…" options={categories.data || []} onChange={(e) => setData({ ...data, category: e.target.value })} error={fields.category} />
                      <TextInput label="Based in" value={data.location || ''} onChange={(e) => setData({ ...data, location: e.target.value })} help="City and country, if known." />
                      <TextArea className="sk-span-2" label="Short description" required value={data.description || ''} onChange={(e) => setData({ ...data, description: e.target.value })} error={fields.description} />
                      <TextArea className="sk-span-2" label="YouTube videos" value={data.videos || ''} onChange={(e) => setData({ ...data, videos: e.target.value })} error={fields.videos} help="Official or public uploads only — one YouTube link per line." />
                    </div>
                  ) : null}
                  {!creates ? (
                    <>
                      <TextInput label="Which page or record?" required value={extra.targetUrl} onChange={(e) => setExtra({ ...extra, targetUrl: e.target.value })} error={fields.targetUrl}
                        help="Paste the Sikhify link (e.g. sikhify.in/gurdwaras/…) or name the page." />
                      <TextArea label={kind === 'incorrect' ? "What's incorrect?" : 'What should change?'} required rows={5} value={extra.message} onChange={(e) => setExtra({ ...extra, message: e.target.value })} error={fields.message} />
                    </>
                  ) : (
                    <TextArea label="Note for the reviewers (optional)" rows={3} value={extra.message} onChange={(e) => setExtra({ ...extra, message: e.target.value })} />
                  )}
                  <TextInput label="Source" required value={extra.source} onChange={(e) => setExtra({ ...extra, source: e.target.value })} error={fields.source}
                    help="Where does this information come from? An official website, announcement, book (with page) or other reference. Please don't guess addresses or phone numbers." />
                  <div className="sk-form-actions">
                    <button type="submit" className="sk-btn sk-btn-gold" disabled={busy}>{busy ? 'Sending…' : 'Send for review'}</button>
                    <span className="sk-card-meta" style={{ marginTop: 0 }}>Reviewed by Sikhify moderators before anything is published.</span>
                  </div>
                </>
              ) : null}
            </form>
          )}
          <section id="mine" className="sk-card" aria-labelledby="mine-title">
            <h2 className="sk-card-title" id="mine-title">My submissions</h2>
            <div className="mt-3"><MySubmissions refreshKey={refreshKey} /></div>
          </section>
        </div>
        <aside className="sk-card" aria-labelledby="how">
          <h2 className="sk-card-title" id="how">How review works</h2>
          <ol className="mt-3 flex flex-col gap-3 sk-card-text">
            <li><strong>1. Pending.</strong> Your submission joins the review queue.</li>
            <li><strong>2. Review.</strong> A moderator checks it against the source you gave.</li>
            <li><strong>3. Approved or not.</strong> Approved information is prepared and published; if it can&apos;t be verified, you&apos;ll get a note explaining why.</li>
          </ol>
          <p className="sk-note mt-4"><Icon name="shield" size={16} /><span>Unverified information is never published automatically.</span></p>
        </aside>
      </div>
    );
  }

  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Community', to: '/community' }, { label: 'Submit / Update Information' }]} eyebrow="Help keep Sikhify accurate"
        title={<>Submit or <span className="gold">update</span> information</>}
        sub="Add a Gurdwara, event, personality, Kirtani, website, app, book or organization — or tell us what needs correcting." />
      <div className="sk-container sk-section">{body}</div>
    </main>
  );
}
