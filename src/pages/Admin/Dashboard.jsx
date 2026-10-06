import { Link } from 'react-router-dom';
import { AdminHeader, StatTile, Pill } from '../../components/admin/AdminKit.jsx';
import { AsyncView } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { formatDate, relativeTime } from '../../utils/format.js';

export default function Dashboard() {
  usePageMeta('Dashboard — Sikhify Admin', 'Sikhify administration dashboard.', { noindex: true });
  const { can } = useAuth();
  const state = useAsync(() => adminService.dashboard(), []);
  return (
    <AsyncView state={state}>
      {({ counts: c, today, todaysHukamnama: hk, recentActivity }) => (
        <>
          <AdminHeader title="Dashboard" sub="Every number is counted live from the database." />
          <section className="sk-card flex flex-wrap items-center justify-between gap-3" aria-labelledby="hk-today">
            <div>
              <h3 className="sk-card-title" id="hk-today">Today&apos;s Hukamnama · {formatDate(today, { weekday: 'long' })}</h3>
              <p className="sk-card-meta">
                {hk ? <>Sikhify record: <Pill value={hk.status} /> · updated {relativeTime(hk.updatedAt)}</>
                  : 'No Sikhify record for today — the site is showing the live BaniDB Hukamnama.'}
              </p>
            </div>
            {can('content.manage') ? (
              hk ? <Link className="sk-btn sk-btn-gold sk-btn-sm" to={`/admin/hukamnama/${hk.id}`}>Open today&apos;s record</Link>
                : <Link className="sk-btn sk-btn-gold sk-btn-sm" to={`/admin/hukamnama/new?date=${today}`}>Add today&apos;s Hukamnama</Link>
            ) : null}
          </section>

          <div className="sk-grid sk-grid-4">
            <StatTile label="Pending reports" value={c.pendingReports} to={can('community.moderate') ? '/admin/reports' : undefined} note="Waiting for a moderator" />
            <StatTile label="Pending submissions" value={c.pendingSubmissions} to={can('submission.review') ? '/admin/submissions' : undefined} note="Waiting for review" />
            <StatTile label="Records needing review" value={c.entriesNeedingReview} to={can('content.manage') ? '/admin/content' : undefined} note="Pending or needs review" />
            <StatTile label="Upcoming events" value={c.upcomingEvents} to={can('content.manage') ? '/admin/events' : undefined} note="Published, today or later" />
          </div>
          <div className="sk-grid sk-grid-4">
            <StatTile label="Users" value={c.users} note={`${c.newUsers7d} new in the last 7 days`} to="/admin/users" />
            <StatTile label="Posts" value={c.posts} to={can('community.moderate') ? '/admin/posts' : undefined} />
            <StatTile label="Comments" value={c.comments} to={can('community.moderate') ? '/admin/comments' : undefined} />
            <StatTile label="Groups" value={c.groups} to={can('community.moderate') ? '/admin/groups' : undefined} />
          </div>
          <div className="sk-grid sk-grid-4">
            <StatTile label="Media artists" value={c.mediaArtists} note={`${c.mediaVideos} published videos`} to={can('content.manage') ? '/admin/media' : undefined} />
            <StatTile label="Published directory records" value={c.entriesPublished} to={can('content.manage') ? '/admin/content' : undefined} />
            <StatTile label="Published Hukamnamas" value={c.hukamnamasPublished} to={can('content.manage') ? '/admin/hukamnama' : undefined} />
          </div>

          <section className="sk-card" aria-labelledby="recent">
            <h3 className="sk-card-title" id="recent">Recent staff activity</h3>
            {recentActivity.length ? (
              <div className="sk-table-wrap mt-3">
                <table className="sk-table">
                  <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Note</th></tr></thead>
                  <tbody>
                    {recentActivity.map((a, i) => (
                      <tr key={i}><td>{relativeTime(a.at)}</td><td>{a.actor || '—'}</td><td><code>{a.action}</code></td><td><span className="sk-clip">{a.note}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="sk-card-meta">No staff actions yet.</p>}
          </section>
        </>
      )}
    </AsyncView>
  );
}
