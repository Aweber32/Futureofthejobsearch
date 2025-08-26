import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Login(){
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e){
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    setLoading(true);
    try{
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  return (
  <Layout title="Job Poster — Login">
      <div className="row justify-content-center">
        <div className="col-md-6">
      <h2>Job Poster Login</h2>
          <form className="mt-3" onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} placeholder="company@example.com" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="password" />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="d-flex gap-2">
              <button className="btn btn-primary" disabled={loading}>{loading? 'Signing in…' : 'Login'}</button>
              <Link href="/poster/signup" className="btn btn-outline-secondary">Sign up</Link>
              <Link href="/" className="btn btn-secondary">Back to welcome</Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
