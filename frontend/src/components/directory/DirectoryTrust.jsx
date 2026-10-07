/* Verification badge for directory records, the "how records are checked" section and the submit call-to-action. */
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { VERIFICATION_LABELS } from '../../../../shared/contentTypes.js';
import './directory.css';

const TONE = { verified: 'is-verified', needs_review: 'is-review', needs_verification: 'is-review' };
const LABEL = { ...VERIFICATION_LABELS, pending: 'Pending review', needs_verification: 'Needs verification' };

/** Status pill: “✓ Verified”, “Pending review”, “Needs review”… — only the record's real status. */
export function VerificationBadge({ status }) {
  return (
    <span className={`sk-dverified ${TONE[status] || 'is-pending'}`}>
      {status === 'verified' ? <Icon name="check" size={12} /> : <Icon name="shield" size={12} />}
      {LABEL[status] || status}
    </span>
  );
}

export function TrustSection({ id = 'trust' }) {
  return (
    <section className="sk-dsection" aria-labelledby={`${id}-h`} id={id}>
      <div className="sk-dtrust" data-motion="reveal">
        <div>
          <p className="sk-dlabel">Trust &amp; verification</p>
          <h2 className="sk-section-title mt-2" id={`${id}-h`}>Every record shows where it comes from</h2>
          <p className="sk-section-sub">Sikhify doesn&apos;t publish anything without a source. Each record lists its references and its verification status, so you can always check it for yourself.</p>
          <p className="mt-4 flex flex-wrap gap-2"><VerificationBadge status="verified" /><VerificationBadge status="pending" /></p>
        </div>
        <ol className="sk-dtrust-steps">
          <li><b>Sourced</b><p>Records come from official Sikh institutions, published references and open data, and always cite them.</p></li>
          <li><b>Reviewed</b><p>A moderator checks every record and every Sangat submission against its sources before it appears.</p></li>
          <li><b>Kept current</b><p>Each page shows when it was last updated. Anyone can suggest a correction, and it goes back to review.</p></li>
        </ol>
      </div>
    </section>
  );
}

export function SubmitCta({ title = 'Know something we should add?', text = 'Send a Gurdwara, event, personality, organization, website, app or book — with its source. Moderators review every submission before it is published.', to = '/submit', label = 'Submit information' }) {
  return (
    <section className="sk-dsection" aria-label="Contribute">
      <div className="sk-dcta" data-motion="reveal">
        <span className="sk-dcta-glyph" aria-hidden="true" lang="pa">ਸੇਵਾ</span>
        <div className="relative">
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="sk-btn sk-btn-gold sk-btn-lg" to={to}><Icon name="plus" size={16} />{label}</Link>
          <Link className="sk-btn sk-btn-lg sk-btn-onnavy" to="/submit?kind=correction">Suggest a correction</Link>
        </div>
      </div>
    </section>
  );
}
