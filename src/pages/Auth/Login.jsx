import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell, { safeNext } from './AuthShell.jsx';
import { TextInput, FormError } from '../../components/ui/Form.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';
import { isReactRoute } from '../../app/navigation.js';

export default function Login() {
  useReactPage('Sign in — Sikhify.in', 'Sign in to your Sikhify account to join the community, save posts and contribute information.', { noindex: true });
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const next = safeNext(search);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const go = (to) => (isReactRoute(to) ? navigate(to, { replace: true }) : window.location.assign(to));
  useEffect(() => { if (user) go(next); /* already signed in */ }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.identifier.trim(), form.password);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in" sub="Welcome back. Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh.">
      <form className="sk-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <TextInput label="Email or username" name="identifier" autoComplete="username" required value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
        <TextInput label="Password" name="password" type="password" autoComplete="current-password" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="submit" className="sk-btn sk-btn-gold" disabled={busy || !form.identifier || !form.password}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <Link className="sk-link-btn" to="/forgot-password">Forgot your password?</Link>
        </div>
      </form>
      <p className="sk-card-text mt-6">New to Sikhify? <Link className="sk-link-btn" to={`/signup${search}`}>Create an account</Link></p>
      <p className="sk-card-meta mt-3">Reading Gurbani, Nitnem, the Hukamnama and Learn never needs an account.</p>
    </AuthShell>
  );
}
