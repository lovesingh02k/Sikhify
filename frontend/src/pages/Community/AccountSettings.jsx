/* Account settings: profile (photo, name, bio, interests, location privacy), password, sessions. */
import { useState } from 'react';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import ImagePicker from '../../components/community/ImagePicker.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { TextInput, PasswordInput, TextArea, Checkbox, FormError } from '../../components/ui/Form.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';
import { userService } from '../../services/community/index.js';
import { authService } from '../../services/auth/authService.js';
import { LIMITS, PASSWORD_MIN } from '../../../../shared/community.js';
import { ROLE_LABELS } from '../../../../shared/roles.js';
import { formatDate, toast } from '../../utils/format.js';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, bio: user.bio, location: user.location, showLocation: user.showLocation, interests: user.interests.join(', '), avatarUrl: user.avatarUrl });
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  const set = (k) => (e) => setForm({ ...form, [k]: e && e.target ? e.target.value : e });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: null, fields: {} });
    try {
      const u = await userService.updateProfile({ ...form, interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean) });
      setUser(u);
      setState({ busy: false, error: null, fields: {} });
      toast('Profile saved');
    } catch (err) {
      setState({ busy: false, error: err, fields: err.fields || {} });
    }
  }

  return (
    <form className="sk-card sk-form" onSubmit={submit} noValidate aria-labelledby="profile-h">
      <h2 className="sk-card-title" id="profile-h">Profile</h2>
      <FormError error={state.error} />
      <div className="flex flex-wrap items-center gap-4">
        <Avatar user={{ name: form.name, avatarUrl: form.avatarUrl }} size={72} />
        <div>
          <ImagePicker value={form.avatarUrl ? [form.avatarUrl] : []} max={1} purpose="avatar" label="Upload a photo" onChange={(urls) => setForm({ ...form, avatarUrl: urls[0] || '' })} />
          {state.fields.avatarUrl ? <p className="sk-form-error">{state.fields.avatarUrl}</p> : <p className="sk-form-help">Optional. If you don&apos;t add one, your initials are shown.</p>}
        </div>
      </div>
      <div className="sk-form-grid">
        <TextInput label="Name" required maxLength={LIMITS.name} value={form.name} onChange={set('name')} error={state.fields.name} />
        <TextInput label="Location" maxLength={120} value={form.location} onChange={set('location')} help="Optional." />
        <TextArea className="sk-span-2" label="Bio" rows={3} maxLength={LIMITS.bio} value={form.bio} onChange={set('bio')} error={state.fields.bio} />
        <TextInput className="sk-span-2" label="Interests" value={form.interests} onChange={set('interests')} error={state.fields.interests} help={`Separate with commas — e.g. Kirtan, Seva, Sikh history (up to ${LIMITS.interests}).`} />
      </div>
      <Checkbox label="Show my location on my profile" help="Off by default. Your email is never shown to anyone." checked={form.showLocation} onChange={(v) => setForm({ ...form, showLocation: v })} />
      <div><button type="submit" className="sk-btn sk-btn-gold" disabled={state.busy}>{state.busy ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  );
}

function PasswordForm() {
  const [pw, setPw] = useState({ current: '', next: '' });
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  async function submit(e) {
    e.preventDefault();
    if (pw.next.length < PASSWORD_MIN) return setState({ ...state, fields: { next: `Use at least ${PASSWORD_MIN} characters` } });
    setState({ busy: true, error: null, fields: {} });
    try {
      await authService.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '' });
      setState({ busy: false, error: null, fields: {} });
      toast('Password changed — other devices were signed out');
    } catch (err) {
      setState({ busy: false, error: err.fields ? null : err, fields: err.fields || {} });
    }
    return undefined;
  }
  return (
    <form className="sk-card sk-form" onSubmit={submit} noValidate aria-labelledby="pw-h">
      <h2 className="sk-card-title" id="pw-h">Password</h2>
      <FormError error={state.error} />
      <div className="sk-form-grid">
        <PasswordInput label="Current password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={state.fields.current} />
        <PasswordInput label="New password" autoComplete="new-password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={state.fields.next} help={`At least ${PASSWORD_MIN} characters.`} />
      </div>
      <div><button type="submit" className="sk-btn" disabled={state.busy || !pw.current || !pw.next}>{state.busy ? 'Saving…' : 'Change password'}</button></div>
    </form>
  );
}

export default function AccountSettings() {
  useReactPage('Settings — Sikhify', 'Your Sikhify account settings.', { noindex: true });
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <CommunityLayout title="Settings" sub="Your profile, password and sessions.">
      <ProfileForm />
      <PasswordForm />
      <section className="sk-card" aria-labelledby="account-h">
        <h2 className="sk-card-title" id="account-h">Account</h2>
        <dl className="sk-dl mt-3">
          <dt>Email</dt><dd>{user.email} <span className="sk-card-meta">(private)</span></dd>
          <dt>Username</dt><dd>@{user.username}</dd>
          <dt>Role</dt><dd>{ROLE_LABELS[user.role]}</dd>
          <dt>Status</dt><dd><span className={`sk-pill sk-pill-${user.status}`}>{user.status}</span></dd>
          <dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd>
        </dl>
        <button type="button" className="sk-btn mt-4" disabled={busy}
          onClick={() => { setBusy(true); authService.logoutEverywhere().finally(() => window.location.assign('/login')); }}>
          Sign out on all devices
        </button>
      </section>
    </CommunityLayout>
  );
}
