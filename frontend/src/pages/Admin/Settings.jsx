/* Platform settings. Each one is enforced by the API (see backend/src/routes/*). */
import { useEffect, useState } from 'react';
import { AdminHeader } from '../../components/admin/AdminKit.jsx';
import { Checkbox, TextArea, FormError } from '../../components/ui/Form.jsx';
import { AsyncView } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { toast } from '../../utils/format.js';

/**
 * Read-only view of how the server is configured. Secrets (database token, email key) are never sent to the
 * browser — only whether each setting is present. Changing them happens in the host's environment variables.
 */
function ServerConfiguration({ canView }) {
  const status = useAsync(() => (canView ? adminService.system() : Promise.resolve(null)), [canView]);
  return (
    <section className="sk-card" aria-labelledby="server-h">
      <h3 className="sk-card-title" id="server-h">Server configuration</h3>
      <p className="sk-card-text mt-1">
        These are set by whoever hosts the site — in the hosting provider&apos;s environment variables (on Vercel: Project → Settings → Environment
        Variables) — not here, so passwords and keys are never exposed in the browser. After changing one, redeploy the site.
      </p>
      {!canView ? <p className="sk-card-meta">Only Master Admins can see the configuration status.</p> : (
        <AsyncView state={status} errorTitle="The configuration status couldn’t be loaded">
          {(d) => (
            <ul className="sk-config-list mt-3">
              {d.items.map((it) => (
                <li key={it.key} className={it.ok ? '' : 'is-warn'}>
                  <span className={`sk-pill sk-pill-${it.ok ? 'active' : 'pending'}`}>{it.ok ? 'OK' : 'Needs attention'}</span>
                  <div className="min-w-0">
                    <p className="sk-config-label">{it.label}: <strong>{it.value}</strong></p>
                    {it.note ? <p className="sk-card-meta" style={{ marginTop: 2 }}>{it.note}</p> : null}
                    <p className="sk-card-meta" style={{ marginTop: 2 }}>Set with {it.vars.map((v, i) => <span key={v}>{i ? ', ' : ''}<code>{v}</code></span>)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      )}
    </section>
  );
}

export default function Settings() {
  usePageMeta('Settings — Sikhify Admin', undefined, { noindex: true });
  const { can } = useAuth();
  const state = useAsync(() => adminService.settings(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (state.data) setForm(state.data); }, [state.data]);
  const editable = can('settings.manage');

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { setForm(await adminService.updateSettings(form)); toast('Settings saved'); } catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <>
      <AdminHeader title="Settings" sub={editable ? 'Changes apply immediately for everyone.' : 'Only Master Admins can change settings.'} />
      <AsyncView state={state}>
        {() => (form ? (
          <form className="sk-card sk-form" onSubmit={save}>
            <FormError error={error} />
            <fieldset className="sk-form" disabled={!editable || busy}>
              <legend className="sk-card-title">Community</legend>
              <Checkbox label="Allow new sign-ups" help="When off, the sign-up form refuses new accounts. Existing members can still sign in." checked={form.registration_open} onChange={(v) => setForm({ ...form, registration_open: v })} />
              <Checkbox label="Read-only community" help="When on, only moderators and admins can post or comment. Everyone can still read." checked={form.community_read_only} onChange={(v) => setForm({ ...form, community_read_only: v })} />
              <Checkbox label="Accept information submissions" help="When off, “Submit / Update Information” is paused." checked={form.submissions_open} onChange={(v) => setForm({ ...form, submissions_open: v })} />
              <TextArea label="Community notice" rows={2} maxLength={500} value={form.community_notice} onChange={(e) => setForm({ ...form, community_notice: e.target.value })}
                help="Shown at the top of every community page (e.g. a Gurpurab greeting or maintenance note). Leave empty to hide." />
            </fieldset>
            {editable ? <div><button type="submit" className="sk-btn sk-btn-gold" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div> : null}
          </form>
        ) : null)}
      </AsyncView>
      {/* Server configuration (hosting environment status) is hidden from the panel on request; the component stays in this file for later use. */}
    </>
  );
}
