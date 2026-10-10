/* ==========================================================================
   /admin — what needs attention first (waiting submissions and reports,
   today's Hukamnama), then the Gurdwara Directory and the rest of the site.
   Every number is counted live from the database by GET /api/admin/dashboard.
   ========================================================================== */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader, StatTile, Pill } from '../../components/admin/AdminKit.jsx';
import { AsyncView } from '../../components/ui/States.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { formatDate, relativeTime } from '../../utils/format.js';
import { activityLabel } from './activityLabels.js';

const n = (x) => Number(x || 0).toLocaleString('en-IN');
const KIND_LABEL = { new: 'New Gurdwara', update: 'Gurdwara update' };

const TONE_TAG = { amber: 'Content', blue: 'Directory', green: 'Community', purple: 'People & media', red: 'Reports', navy: 'Site' };
const parseAt = (at) => new Date(String(at).endsWith('Z') ? at : String(at).replace(' ', 'T') + 'Z');
function dayLabel(d) {
  const key = (x) => x.toLocaleDateString('en-CA');
  const today = new Date(); const yesterday = new Date(Date.now() - 864e5);
  if (key(d) === key(today)) return 'Today';
  if (key(d) === key(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

/** Staff activity: grouped by day, newest first — who did what, the note, when. */
function StaffActivity({ items }) {
  const [all, setAll] = useState(false);
  if (!items.length) return <p className="sk-card-meta">No staff actions yet.</p>;
  const shown = all ? items : items.slice(0, 6);
  const groups = [];
  for (const a of shown) {
    const d = parseAt(a.at);
    const label = dayLabel(d);
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, rows: [] });
    groups[groups.length - 1].rows.push({ a, d });
  }
  return (
    <div className="sk-activity-wrap">
      {groups.map((g) => (
        <section key={g.label} className="sk-activity-day" aria-label={g.label}>
          <p className="sk-activity-day-label">{g.label}</p>
          <ol className="sk-activity" role="list">
            {g.rows.map(({ a, d }, i) => {
              const l = activityLabel(a.action);
              return (
                <li key={i} className="sk-activity-item">
                  <span className={`sk-activity-icon tone-${l.tone}`} aria-hidden="true"><Icon name={l.icon} size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="sk-activity-text"><strong>{a.actor || 'Someone (account removed)'}</strong> {l.text}</p>
                    {a.note ? <p className="sk-activity-note" title={a.note}>{a.note}</p> : null}
                  </div>
                  <div className="sk-activity-side">
                    <span className={`sk-activity-tag tone-${l.tone}`}>{TONE_TAG[l.tone] || 'Site'}</span>
                    <time className="sk-activity-time" dateTime={d.toISOString()} title={d.toLocaleString('en-IN')}>{relativeTime(d.toISOString())}</time>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {items.length > 6 ? (
        <button type="button" className="sk-activity-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? 'Show less' : `Show all ${items.length} actions`}<Icon name="chevron" size={14} className={all ? 'sk-rot-180' : ''} />
        </button>
      ) : null}
    </div>
  );
}

/** One figure in "Across the site": icon, number, note — a link to its admin page when allowed. */
function SiteFigure({ icon, tone, label, value, note, to }) {
  const body = (
    <>
      <span className={`sk-site-icon tone-${tone}`} aria-hidden="true"><Icon name={icon} size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="sk-site-label">{label}</span>
        <span className="sk-site-value">{value}</span>
        {note ? <span className="sk-site-note">{note}</span> : null}
      </span>
      {to ? <Icon name="chevron" size={14} className="sk-site-go sk-rot-270" /> : null}
    </>
  );
  return <li>{to ? <Link className="sk-site-item" to={to}>{body}</Link> : <div className="sk-site-item">{body}</div>}</li>;
}

function RecentSubmissions({ items, canReview }) {
  if (!items.length) return <p className="sk-card-meta">Nothing has been submitted yet.</p>;
  return (
    <ul className="sk-dash-list">
      {items.map((s) => (
        <li key={`${s.queue}-${s.id}`}>
          <span className="sk-dash-initials" aria-hidden="true">{String(s.title || '?').trim().slice(0, 3).toLowerCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="sk-dash-list-title">{s.title || '(untitled)'}</p>
            <p className="sk-card-meta" style={{ marginTop: 2 }}>
              {s.queue === 'gurdwara' ? KIND_LABEL[s.kind] || 'Gurdwara' : 'Information'} · {s.submitter || (s.guest ? 'Guest' : 'Former member')} · {relativeTime(s.createdAt)}
            </p>
          </div>
          <span className="flex items-center gap-2">
            <Pill value={s.status} label={s.status.replace(/_/g, ' ')} />
            {canReview && s.status === 'pending' ? <Link className="sk-btn sk-btn-sm" to={s.queue === 'gurdwara' ? '/admin/submissions' : '/admin/submissions?tab=information'}>Review</Link> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  usePageMeta('Dashboard — Sikhify Admin', 'Sikhify administration dashboard.', { noindex: true });
  const { can } = useAuth();
  const state = useAsync(() => adminService.dashboard(), []);
  return (
    <AsyncView state={state} errorTitle="The dashboard couldn’t be loaded">
      {({ counts: c, today, todaysHukamnama: hk, recentActivity, recentSubmissions = [] }) => {
        const waiting = (c.pendingSubmissions || 0) + (c.pendingGurdwaraSubmissions || 0);
        return (
          <>
            <AdminHeader title="Dashboard" sub="Every number is counted live from the database." decor />

            <section aria-labelledby="attention-h" className="sk-stack sk-dash-panel" style={{ gap: '0.9rem' }}>
              <h3 className="sk-dash-h" id="attention-h"><span className="sk-dash-h-icon tone-amber" aria-hidden="true"><Icon name="flag" size={18} /></span>Needs your attention</h3>
              <div className="sk-grid sk-grid-3">
                <StatTile icon="inbox" tone="blue" label="Submissions waiting" value={waiting} to={can('submission.review') ? '/admin/submissions' : undefined}
                  note={`${c.pendingGurdwaraSubmissions || 0} Gurdwara · ${c.pendingSubmissions || 0} other`} />
                <StatTile icon="message" tone="green" label="Reports waiting" value={c.pendingReports} to={can('community.moderate') ? '/admin/reports' : undefined} note="Posts, comments, people or groups" />
                <StatTile icon="shield" tone="purple" label="Gurdwaras to verify" value={c.gurdwarasNeedVerification} to={can('content.manage') ? '/admin/gurdwaras?verification=needs_verification' : undefined} note="Listed, marked “needs verification”" />
              </div>
              <div className="sk-card sk-dash-hk flex flex-wrap items-center justify-between gap-3">
                <span className="khanda-mark sk-dash-hk-mark" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="sk-card-title" style={{ fontSize: '1rem' }}>Today&apos;s Hukamnama <span className="sk-dash-dot" aria-hidden="true">·</span> {formatDate(today, { weekday: 'long' })}</p>
                  <p className="sk-card-meta">
                    {hk ? <>Sikhify record: <Pill value={hk.status} /> · updated {relativeTime(hk.updatedAt)}</>
                      : 'No Sikhify record for today — the site is showing the live BaniDB Hukamnama.'}
                  </p>
                </div>
                {can('content.manage') ? (
                  hk ? <Link className="sk-btn sk-btn-gold sk-btn-sm sk-dash-hk-btn" to={`/admin/hukamnama/${hk.id}`}><Icon name="book" size={16} />Open today&apos;s record<Icon name="chevron" size={14} className="sk-rot-270" /></Link>
                    : <Link className="sk-btn sk-btn-gold sk-btn-sm sk-dash-hk-btn" to={`/admin/hukamnama/new?date=${today}`}><Icon name="book" size={16} />Add today&apos;s Hukamnama<Icon name="chevron" size={14} className="sk-rot-270" /></Link>
                ) : null}
              </div>
            </section>

            <section aria-labelledby="gd-h" className="sk-stack" style={{ gap: '0.75rem' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="sk-dash-h" id="gd-h"><span className="sk-dash-h-icon tone-navy" aria-hidden="true"><Icon name="pin" size={18} /></span>Gurdwara Directory</h3>
                {can('content.manage') ? <Link className="sk-dash-link" to="/admin/gurdwaras">Manage the directory <span aria-hidden="true">→</span></Link> : null}
              </div>
              <div className="sk-grid sk-grid-4">
                <StatTile icon="file" tone="blue" mark="layers" label="Total records" value={c.gurdwarasTotal} />
                <StatTile icon="upload" tone="green" mark="globe" label="Listed publicly" value={c.gurdwarasListed} note="Published (not archived)" />
                <StatTile icon="shield" tone="purple" mark="check" label="Verified" value={c.gurdwarasVerified} note="Checked against a source" />
                <StatTile icon="archive" tone="red" mark="trash" label="Archived" value={c.gurdwarasArchived} note="Withheld from the public" />
              </div>
            </section>

            <div className="sk-grid sk-grid-2" style={{ alignItems: 'start' }}>
              <section className="sk-card" aria-labelledby="recent-sub-h">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="sk-dash-h sk-dash-h-sm" id="recent-sub-h"><Icon name="file" size={18} />Recent submissions</h3>
                  {can('submission.review') ? <Link className="sk-dash-link" to="/admin/submissions">Open the inbox <span aria-hidden="true">→</span></Link> : null}
                </div>
                <div className="mt-3"><RecentSubmissions items={recentSubmissions} canReview={can('submission.review')} /></div>
              </section>
              <section className="sk-card" aria-labelledby="site-h">
                <h3 className="sk-dash-h sk-dash-h-sm" id="site-h"><Icon name="chart" size={18} />Across the site</h3>
                <ul className="sk-site-grid mt-3" role="list">
                  <SiteFigure icon="image" tone="amber" label="Live homepage banners" value={n(c.bannersLive)} to={can('content.manage') ? '/admin/banners' : undefined} />
                  <SiteFigure icon="users" tone="purple" label="Users" value={n(c.users)} note={`${n(c.newUsers7d)} new this week`} to={can('admin.access') ? '/admin/users' : undefined} />
                  <SiteFigure icon="message" tone="green" label="Community" value={`${n(c.posts)} · ${n(c.comments)} · ${n(c.groups)}`} note="posts · comments · groups" to={can('community.moderate') ? '/admin/posts' : undefined} />
                  <SiteFigure icon="calendar" tone="blue" label="Upcoming events" value={n(c.upcomingEvents)} to={can('content.manage') ? '/admin/events' : undefined} />
                  <SiteFigure icon="globe" tone="blue" label="Directory records" value={n(c.entriesPublished)} note={`${n(c.entriesNeedingReview)} need review`} to={can('content.manage') ? '/admin/content' : undefined} />
                  <SiteFigure icon="youtube" tone="red" label="Gurbani media" value={`${n(c.mediaArtists)} · ${n(c.mediaVideos)}`} note="artists · videos" to={can('content.manage') ? '/admin/media' : undefined} />
                  <SiteFigure icon="book" tone="amber" label="Published Hukamnamas" value={n(c.hukamnamasPublished)} to={can('content.manage') ? '/admin/hukamnama' : undefined} />
                </ul>
              </section>
            </div>

            <section className="sk-card" aria-labelledby="recent">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="sk-dash-h sk-dash-h-sm" id="recent"><Icon name="history" size={18} />Recent staff activity</h3><span className="sk-card-meta" style={{ marginTop: 0 }}>Latest {recentActivity.length} actions by admins and moderators</span></div>
              <div className="mt-3"><StaffActivity items={recentActivity} /></div>
            </section>
          </>
        );
      }}
    </AsyncView>
  );
}
