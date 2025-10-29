import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import API_CONFIG from '../../config/api';

// Simple password policy to mirror backend Identity settings
// - min length 8
// - at least one digit
function validatePassword(pw) {
  if (!pw || pw.length < 8) return { ok: false, reason: 'Must be at least 8 characters.' };
  if (!/[0-9]/.test(pw)) return { ok: false, reason: 'Must include at least one number.' };
  return { ok: true };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { uid, token } = router.query;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const pwCheck = useMemo(() => validatePassword(password), [password]);
  const matches = useMemo(() => password === confirm && confirm.length > 0, [password, confirm]);

  const canSubmit = !!uid && !!token && pwCheck.ok && matches && !submitting;

  useEffect(() => {
    if (!router.isReady) return;
    if (!uid || !token) {
      setError('Invalid or missing reset link. Please request a new password reset email.');
    }
  }, [router.isReady, uid, token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_CONFIG.API_URL}/api/seekers/password-reset-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, token, newPassword: password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('Your password has been reset. You can now sign in.');
        // optional redirect after a short delay
        setTimeout(() => router.push('/seeker/login'), 2000);
      } else {
        setError(data?.error || 'Failed to reset password. The link may have expired. Please request a new one.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{maxWidth:'520px'}}> 
      <h1 className="h3 mb-3">Reset your password</h1>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="alert">{message}</div>}

      <form onSubmit={onSubmit} className="card p-3 shadow-sm">
        <div className="mb-3">
          <label className="form-label">New password</label>
          <div className="input-group">
            <input
              type={show ? 'text' : 'password'}
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          {!pwCheck.ok && password.length > 0 && (
            <div className="form-text text-danger">{pwCheck.reason}</div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Confirm new password</label>
          <input
            type={show ? 'text' : 'password'}
            className={`form-control ${confirm.length>0 && !matches ? 'is-invalid' : ''}`}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {confirm.length>0 && !matches && (
            <div className="invalid-feedback">Passwords do not match.</div>
          )}
        </div>

        <button className="btn btn-primary w-100" disabled={!canSubmit} type="submit">
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="mt-3 small text-muted">
        This link may expire for your security. If it fails, request a new password reset email.
      </p>
    </div>
  );
}
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import Link from 'next/link'
import { API_CONFIG } from '../../config/api'

const API = API_CONFIG.BASE_URL

export default function ResetPassword(){
  const router = useRouter()
  const { uid, token } = router.query

  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    setSubmitting(true); setMessage(''); setError('')
    try{
      const res = await fetch(`${API}/api/seekers/password-reset-confirm`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ userId: uid, token, newPassword })
      })
      const body = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(body?.error || 'Failed to reset password')
      setMessage('Password updated. Redirecting to sign in…')
      setTimeout(() => router.push('/seeker/login'), 1500)
    }catch(err){ setError(err?.message || 'Failed to reset password') }
    finally{ setSubmitting(false) }
  }

  return (
    <Layout title="Reset Password">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Reset Password</h2>
        <Link href="/seeker/login" className="btn btn-outline-secondary">Return</Link>
      </div>

      {(message || error) && (
        <div className={`alert ${error ? 'alert-danger' : 'alert-success'}`}>{error || message}</div>
      )}

      <div className="card shadow-sm border-0" style={{borderRadius:'12px'}}>
        <div className="card-body">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
              <div className="form-text">Must be at least 8 characters and include a number.</div>
            </div>
            <button className="btn btn-primary" disabled={submitting}>Set New Password</button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
