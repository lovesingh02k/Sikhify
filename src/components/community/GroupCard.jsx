import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { plural } from '../../utils/format.js';
import { GROUP_ROLE_LABELS } from '../../../shared/roles.js';

export default function GroupCard({ group: g }) {
  return (
    <Link className="sk-card sk-card-link h-full" to={`/community/groups/${g.slug}`} style={{ overflow: 'hidden' }}>
      <div className="sk-cover" style={{ height: 96, ...(g.coverUrl ? { backgroundImage: `url("${g.coverUrl}")` } : {}) }} aria-hidden="true" />
      <div className="flex flex-wrap gap-1 mt-3">
        <span className="sk-badge">{g.category}</span>
        {g.privacy === 'private' ? <span className="sk-badge sk-badge-muted"><Icon name="lock" size={10} />Private</span> : null}
        {g.status === 'suspended' ? <span className="sk-pill sk-pill-suspended">Suspended</span> : null}
      </div>
      <h3 className="sk-card-title mt-2">{g.name}</h3>
      <p className="sk-card-text">{g.description}</p>
      <div className="sk-card-foot">
        <span className="sk-card-meta" style={{ marginTop: 0 }}>{plural(g.memberCount, 'member')} · {plural(g.postCount, 'post')}{g.location ? ` · ${g.location}` : ''}</span>
        {g.viewer.isMember ? <span className="sk-pill sk-pill-member">{GROUP_ROLE_LABELS[g.viewer.role]}</span> : g.viewer.isPending ? <span className="sk-pill sk-pill-pending">Requested</span> : null}
      </div>
    </Link>
  );
}
