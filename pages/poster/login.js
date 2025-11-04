import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { API_CONFIG } from '../../config/api';

const API = API_CONFIG.BASE_URL;

export default function Login(){
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [sendingForgot, setSendingForgot] = useState(false);

  async function submit(e){
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    setLoading(true);
    try{
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: form.email, Password: form.password })
      });
      const txt = await res.text();
      let data;
      try { data = txt ? JSON.parse(txt) : {}; } catch { data = { message: txt }; }
      if (!res.ok) {
        const msg = data.error || data.message || 'Login failed';
        throw new Error(msg);
      }
      // success - store token if provided
      if (data?.token) {
        try { localStorage.setItem('fjs_token', data.token); } catch {}
      }
      router.push('/poster/dashboard');
    }catch(err){
      setError(err?.message || 'Login failed');
    }finally{ setLoading(false); }
  }

  async function handleForgotPassword(){
    setForgotMessage(''); setError(''); setSendingForgot(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try{
      await fetch(`${API}/api/auth/password-reset-request`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
        signal: controller.signal
      }).then(r => r.json().catch(()=>({}))).catch(()=>null);
      setForgotMessage('If an account exists, a reset link has been sent to your email.');
    }catch{
      setForgotMessage('If an account exists, a reset link has been sent to your email.');
    } finally {
      clearTimeout(timeout);
      setSendingForgot(false);
    }
  }

  return (
  <Layout title="Job Poster — Login">
      <div className="row justify-content-center">
        <div className="col-md-6">
      <h2>Job Poster Login</h2>

          {forgotMode ? (
            <div className="mt-3">
              <p className="text-muted">Enter your email address and we'll send you a password reset link.</p>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input 
                  type="email"
                  className="form-control" 
                  value={forgotEmail} 
                  onChange={(e)=>setForgotEmail(e.target.value)} 
                  placeholder="company@example.com"
                  required
                />
              </div>
              {forgotMessage && <div className="alert alert-info">{forgotMessage}</div>}
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-primary d-inline-flex align-items-center gap-2" 
                  onClick={handleForgotPassword} 
                  disabled={sendingForgot || !forgotEmail}
                >
                  {sendingForgot && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                  {sendingForgot ? 'Sending…' : 'Send reset link'}
                </button>
                <button className="btn btn-outline-secondary" onClick={()=>{setForgotMode(false); setForgotMessage(''); setError('');}}>Back to login</button>
              </div>
            </div>
          ) : (
          <form className="mt-3" onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} placeholder="company@example.com" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="password" />
            </div>
            <div className="mb-3">
              <button type="button" className="btn btn-link p-0 text-decoration-none small" onClick={()=>setForgotMode(true)}>Forgot password?</button>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="d-flex gap-2">
              <button className="btn btn-primary" disabled={loading}>{loading? 'Signing in…' : 'Login'}</button>
              <Link href="/poster/signup" className="btn btn-outline-secondary">Sign up</Link>
              <Link href="/" className="btn btn-secondary">Back to welcome</Link>
            </div>
          </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
