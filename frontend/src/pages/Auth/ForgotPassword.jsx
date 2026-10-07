import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import { TextInput, FormError } from '../../components/ui/Form.jsx';
import { authService } from '../../services/auth/authService.js';
import { useReactPage } from '../../hooks/useReactPage.js';

export default function ForgotPassword() {
  useReactPage('Forgot password — Sikhify.in', 'Reset the password for your Sikhify account.', { noindex: true });
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, error: null, done: null, fields: {} });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: null, done: null, fields: {} });
    try {
      const res = await authService.forgotPassword(email.trim());
      setState({ busy: false, error: null, done: res.message, fields: {} });
    } catch (err) {
      setState({ busy: false, error: err, done: null, fields: err.fields || {} });
    }
  }

  return (
    <AuthShell title="Forgot your password?" sub="Enter the email you signed up with and we'll send you a link to choose a new password." crumb="Forgot password">
      {state.done ? (
        <div className="sk-stack">
          <p className="sk-form-success" role="status">{state.done}</p>
          <p className="sk-card-text">The link works for one hour. Check your spam folder if it doesn't arrive within a few minutes.</p>
          <Link className="sk-btn" to="/login">Back to sign in</Link>
        </div>
      ) : (
        <form className="sk-form" onSubmit={submit} noValidate>
          <FormError error={state.error && !state.error.fields ? state.error : null} />
          <TextInput label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={state.fields.email} />
          <div className="sk-form-actions">
            <button type="submit" className="sk-btn sk-btn-gold" disabled={state.busy || !email}>{state.busy ? 'Sending…' : 'Send reset link'}</button>
            <Link className="sk-link-btn" to="/login">Back to sign in</Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
