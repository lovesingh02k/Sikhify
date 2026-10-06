import { AdminHeader, BarChart, HBarList, StatTile } from '../../components/admin/AdminKit.jsx';
import { AsyncView } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { CONTENT_TYPES } from '../../../shared/contentTypes.js';
import { ROLE_LABELS } from '../../../shared/roles.js';

export default function Analytics() {
  usePageMeta('Analytics — Sikhify Admin', undefined, { noindex: true });
  const state = useAsync(() => adminService.analytics(), []);
  return (
    <AsyncView state={state}>
      {(a) => (
        <>
          <AdminHeader title="Analytics" sub={`Counted from the database for the last ${a.rangeDays} days. No estimates or sampled data.`} />
          <div className="sk-grid sk-grid-4">
            <StatTile label="Sign-ups" value={a.signups.reduce((s, d) => s + d.value, 0)} note={`Last ${a.rangeDays} days`} />
            <StatTile label="Active members" value={a.activeUsers30d} note={`Signed in during the last ${a.rangeDays} days`} />
            <StatTile label="Posts" value={a.posts.reduce((s, d) => s + d.value, 0)} note={`Last ${a.rangeDays} days`} />
            <StatTile label="Comments" value={a.comments.reduce((s, d) => s + d.value, 0)} note={`Last ${a.rangeDays} days`} />
          </div>
          <div className="sk-grid sk-grid-2">
            <BarChart title="New sign-ups per day" series={a.signups} />
            <BarChart title="Posts per day" series={a.posts} />
            <BarChart title="Comments per day" series={a.comments} />
            <BarChart title="Reactions per day" series={a.reactions} />
          </div>
          <div className="sk-grid sk-grid-2">
            <HBarList title="Largest groups (active members)" rows={a.topGroups} empty="No groups yet." />
            <HBarList title="Published directory records by type" rows={a.entriesByType} empty="No published records yet." format={(t) => (CONTENT_TYPES[t] ? CONTENT_TYPES[t].plural : t)} />
            <HBarList title="Users by role" rows={a.usersByRole} format={(r) => ROLE_LABELS[r] || r} />
            <HBarList title="Reports by status" rows={a.reportsByStatus} empty="No reports yet." format={(s) => s[0].toUpperCase() + s.slice(1)} />
            <HBarList title="Submissions by status" rows={a.submissionsByStatus} empty="No submissions yet." format={(s) => s[0].toUpperCase() + s.slice(1)} />
          </div>
        </>
      )}
    </AsyncView>
  );
}
