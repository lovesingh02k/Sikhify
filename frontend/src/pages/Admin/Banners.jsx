/* ==========================================================================
   /admin/banners — homepage banners: what is live, scheduled, expired or a
   draft; display order; publish / unpublish; delete (with confirmation).
   Up to `maxPublic` live banners are shown on the homepage, top first.
   ========================================================================== */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { FormError } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { formatDate, toast } from '../../utils/format.js';

const STATE_LABEL = { live: 'Live', scheduled: 'Scheduled', expired: 'Ended', draft: 'Draft' };

function when(b) {
  // A published festival banner is hidden while its festival has no upcoming verified date.
  if (b.observanceProblem && b.status === 'published') return `Hidden: ${b.observanceProblem.toLowerCase()}`;
  if (b.state === 'scheduled') return `Starts ${formatDate(b.startsAt)}`;
  if (b.state === 'expired') return `Ended ${formatDate(b.endsAt)}`;
  if (b.state === 'live' && b.endsAt) return `Until ${formatDate(b.endsAt)}`;
  return b.state === 'live' ? 'On the homepage now' : 'Not on the homepage';
}

export default function Banners() {
  usePageMeta('Homepage banners — Sikhify Admin', undefined, { noindex: true });
  const { can } = useAuth();
  const state = useAsync(() => adminService.banners(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const run = (fn, done) => {
    setBusy(true); setError(null);
    return fn().then((r) => { done && toast(done); state.reload(); return r; }).catch(setError).finally(() => setBusy(false));
  };
  const move = (items, i, dir) => {
    const ids = items.map((b) => b.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => adminService.reorderBanners(ids), 'Order saved');
  };

  return (
    <>
      <AdminHeader title="Homepage banners" sub="A banner can show an image, a YouTube video, or both — with a title, a short description and an optional button."
        actions={<Link className="sk-btn sk-btn-gold" to="/admin/banners/new"><Icon name="plus" size={15} />New banner</Link>} />
      <FormError error={error} />
      <AsyncView state={state}>
        {(d) => (d.items.length ? (
          <>
            <p className="sk-card-meta" style={{ marginTop: 0 }}>The homepage shows up to {d.maxPublic} live banners, in this order. Drafts and ended banners are never shown.</p>
            <ul className="sk-banner-list">
              {d.items.map((b, i) => (
                <li key={b.id} className="sk-card sk-banner-row">
                  <div className="sk-banner-thumb" aria-hidden="true">
                    {b.observanceId ? <span className="sk-banner-thumb-fest"><span className="khanda-mark" /></span> : b.image ? <img src={b.image.url} alt="" loading="lazy" /> : b.youtubeId ? <img src={`https://i.ytimg.com/vi/${b.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" /> : null}
                    {b.youtubeId ? <span className="sk-banner-thumb-badge"><Icon name="play" size={12} />Video</span> : null}
                    {b.observanceId ? <span className="sk-banner-thumb-badge">Festival</span> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="sk-card-title" style={{ fontSize: '1rem' }}><Link to={`/admin/banners/${b.id}`}>{b.title}</Link></p>
                    <p className="sk-card-meta" style={{ marginTop: 4 }}><Pill value={b.state} label={STATE_LABEL[b.state]} /> · {when(b)}</p>
                    {b.observance ? <p className="sk-card-meta" style={{ marginTop: 2 }}>Festival: {b.observanceTitle} · {b.observance.start}</p> : null}
                    {d.items.filter((x) => x.state === 'live' && !x.observanceProblem).findIndex((x) => x.id === b.id) >= d.maxPublic
                      ? <p className="sk-form-error" style={{ marginTop: 2 }}>Not on the homepage: only the first {d.maxPublic} live banners are shown — move it up.</p> : null}
                  </div>
                  <div className="sk-banner-row-actions">
                    <button type="button" className="sk-icon-btn" aria-label={`Move “${b.title}” up`} disabled={busy || i === 0} onClick={() => move(d.items, i, -1)}><Icon name="chevron" size={16} className="sk-rot-180" /></button>
                    <button type="button" className="sk-icon-btn" aria-label={`Move “${b.title}” down`} disabled={busy || i === d.items.length - 1} onClick={() => move(d.items, i, 1)}><Icon name="chevron" size={16} /></button>
                    <Link className="sk-btn sk-btn-sm" to={`/admin/banners/${b.id}`}>Edit</Link>
                    {b.status === 'published'
                      ? <button type="button" className="sk-btn sk-btn-sm" disabled={busy} onClick={() => run(() => adminService.setBannerStatus(b.id, 'draft'), 'Unpublished — it is no longer on the homepage')}>Unpublish</button>
                      : <button type="button" className="sk-btn sk-btn-sm sk-btn-gold" disabled={busy} onClick={() => run(() => adminService.setBannerStatus(b.id, 'published'), 'Published')}>Publish</button>}
                    {can('content.delete') ? <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" disabled={busy} onClick={() => setConfirm(b)}>Delete…</button> : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Empty icon="image" title="No banners yet" text="When no banner is live, the homepage simply goes from the shortcuts to the rest of the page.">
            <Link className="sk-btn sk-btn-gold sk-btn-sm" to="/admin/banners/new">Create the first banner</Link>
          </Empty>
        ))}
      </AsyncView>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title="Delete this banner?">
        {confirm ? (
          <div className="sk-form">
            <p>“{confirm.title}” will be removed permanently{confirm.state === 'live' ? ' and taken off the homepage now' : ''}. To hide it but keep it, unpublish it instead.</p>
            <div className="sk-form-actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="sk-btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="sk-btn sk-btn-danger" disabled={busy} onClick={() => run(() => adminService.deleteBanner(confirm.id), 'Banner deleted').then(() => setConfirm(null))}>Delete permanently</button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
