/* ==========================================================================
   Pieces shared by the public submission forms ("Suggest a Gurdwara" and
   "Submit / Update Information"):
   • GuestContact — for visitors who aren't signed in: optional name and email
     (only so reviewers can follow up), plus a hidden field people never see
     that simple spam bots fill in (the server then stores nothing).
   • SubmissionReceived — the confirmation, shown only after the server has
     saved the submission, with its reference.
   ========================================================================== */
import { Link } from 'react-router-dom';
import { TextInput } from '../ui/Form.jsx';

/** The name the API checks for the hidden anti-spam field (lib/submitters.js HONEYPOT_FIELD). */
export const HONEYPOT_FIELD = 'company_website';

export function GuestContact({ value, onChange, errors = {}, next }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="sk-fieldset sk-guest">
      <legend>Your details (optional)</legend>
      <p className="sk-form-help" style={{ marginTop: 0 }}>
        You don&apos;t need an account to send this. Leave a name or email only if you&apos;d like us to be able to contact you about it.
        {next ? <> Or <Link className="panel-view-all" to={`/login?next=${next}`}>sign in</Link> to follow its review in your account.</> : null}
      </p>
      <div className="sk-form-grid">
        <TextInput label="Your name (optional)" autoComplete="name" maxLength={80} value={value.guestName || ''} onChange={set('guestName')} error={errors.guestName} />
        <TextInput label="Email (optional)" type="email" inputMode="email" autoComplete="email" maxLength={200} value={value.guestEmail || ''} onChange={set('guestEmail')} error={errors.guestEmail}
          help="Used only to reply about this submission. Never shown publicly." />
      </div>
      {/* Hidden from people (and from screen readers); bots that fill every field reveal themselves. */}
      <div className="sk-hp" aria-hidden="true">
        <label htmlFor="sk-hp-field">Leave this field empty</label>
        <input id="sk-hp-field" type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={value[HONEYPOT_FIELD] || ''} onChange={set(HONEYPOT_FIELD)} />
      </div>
    </fieldset>
  );
}

export function SubmissionReceived({ reference, signedIn, what = 'submission', children }) {
  return (
    <div className="sk-form-success" role="status" tabIndex={-1}>
      <p><strong>Thank you — your {what} was received.</strong> It is now <strong>waiting for review</strong> and won&apos;t be published until the Sikhify team has checked it.</p>
      {reference ? <p className="mt-2">Your reference: <strong className="sk-ref">{reference}</strong> — quote it if you contact us about this {what}.</p> : null}
      <p className="mt-2">{signedIn ? 'You’ll get a notification when it has been reviewed.' : 'Because you aren’t signed in, we can only contact you if you left an email address.'}</p>
      {children}
    </div>
  );
}
