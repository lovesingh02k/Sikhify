import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell, { safeNext } from './AuthShell.jsx';
import { TextInput, FormError } from '../../components/ui/Form.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';
import { isReactRoute } from '../../app/navigation.js';
import { USERNAME_RE, PASSWORD_MIN } from '../../../shared/community.js';

export default function Signup() {
  useReactPage('Create an account — Sikhify.in', 'Join the Sikhify community: share with the Sangat, join groups and help keep Sikh information accurate.', { noindex: true });
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const next = safeNext(search);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) (isReactRoute(next) ? navigate(next, { replace: true }) : window.location.assign(next));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => {
    const v = k === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value;
    setForm({ ...form, [k]: v });
    if (fields[k]) setFields({ ...fields, [k]: undefined });
  };

  function validate() {
    const f = {};
    if (form.name.trim().length < 2) f.name = 'Enter your name';
    if (!USERNAME_RE.test(form.username)) f.username = '3–30 characters: lowercase letters, numbers, dots or underscores';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) f.email = 'Enter a valid email address';
    if (form.password.length < PASSWORD_MIN) f.password = `Use at least ${PASSWORD_MIN} characters`;
    return f;
  }

  async function submit(e) {
    e.preventDefault();
    const f = validate();
    setFields(f);
    if (Object.keys(f).length) return;
    setBusy(true);
    setError(null);
    try {
      await signup({ ...form, name: form.name.trim(), email: form.email.trim() });
    } catch (err) {
      setFields(err.fields || {});
      setError(err);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" sub="Join the Sangat on Sikhify — share, learn together and help keep Sikh information accurate." crumb="Create account">
      <form className="sk-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <TextInput label="Your name" autoComplete="name" required value={form.name} onChange={set('name')} error={fields.name} />
        <TextInput label="Username" autoComplete="username" required value={form.username} onChange={set('username')} error={fields.username}
          help="Shown on your profile, e.g. sikhify.in/community/profile/your.name" />
        <TextInput label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={fields.email}
          help="Never shown publicly. Used only to sign in and reset your password." />
        <TextInput label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} error={fields.password}
          help={`At least ${PASSWORD_MIN} characters.`} />
        <button type="submit" className="sk-btn sk-btn-gold" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
        <p className="sk-card-meta">By joining you agree to keep the community respectful of the Gurus, Gurbani and one another. Posts can be reported and are reviewed by moderators.</p>
      </form>
      <p className="sk-card-text mt-6">Already have an account? <Link className="sk-link-btn" to={`/login${search}`}>Sign in</Link></p>
    </AuthShell>
  );
}
