import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import { PasswordInput, FormError } from '../../components/ui/Form.jsx';
import { authService } from '../../services/auth/authService.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { PASSWORD_MIN } from '../../../../shared/community.js';

export default function ResetPassword() {
  useReactPage('Choose a new password — Sikhify.in', 'Choose a new password for your Sikhify account.', { noindex: true });
  const token = new URLSearchParams(useLocation().search).get('token') || '';
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [state, setState] = useState({ busy: false, error: null, done: false, fields: {} });

  async function submit(e) {
    e.preventDefault();
    if (pw.password.length < PASSWORD_MIN) return setState({ ...state, fields: { password: `Use at least ${PASSWORD_MIN} characters` } });
    if (pw.password !== pw.confirm) return setState({ ...state, fields: { confirm: "The passwords don't match" } });
    setState({ busy: true, error: null, done: false, fields: {} });
    try {
      await authService.resetPassword(token, pw.password);
      setState({ busy: false, error: null, done: true, fields: {} });
    } catch (err) {
      setState({ busy: false, error: err, done: false, fields: err.fields || {} });
    }
    return undefined;
  }

  if (!token) {
    return (
      <AuthShell title="Reset link missing" crumb="Reset password">
        <p className="sk-card-text">This page needs the reset link a Sikhify admin gave you. If you can't sign in, ask an admin for a new link.</p>
        <Link className="sk-btn sk-btn-gold mt-4" to="/login">Back to sign in</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password" crumb="Reset password">
      {state.done ? (
        <div className="sk-stack">
          <p className="sk-form-success" role="status">Your password has been changed. For your security, you've been signed out everywhere.</p>
          <Link className="sk-btn sk-btn-gold" to="/login">Sign in</Link>
        </div>
      ) : (
        <form className="sk-form" onSubmit={submit} noValidate>
          <FormError error={state.error && !state.error.fields ? state.error : null} />
          {state.error && /expired|invalid/i.test(state.error.message) ? <p className="sk-card-meta">This link has expired — ask a Sikhify admin for a new one.</p> : null}
          <PasswordInput label="New password" autoComplete="new-password" required value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} error={state.fields.password} help={`At least ${PASSWORD_MIN} characters.`} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={state.fields.confirm} />
          <button type="submit" className="sk-btn sk-btn-gold" disabled={state.busy}>{state.busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      )}
    </AuthShell>
  );
}
