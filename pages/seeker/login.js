import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { API_CONFIG } from '../../config/api';

const API = API_CONFIG.BASE_URL;

export default function SeekerLogin(){
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e){
    e?.preventDefault();
    setError('');
    setLoading(true);
    try{
      const res = await fetch(`${API}/api/seekers/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Email: form.email, Password: form.password }) });
      const txt = await res.text(); let data = {};
      try{ data = txt ? JSON.parse(txt) : {}; } catch { data = { message: txt }; }
      if (!res.ok) throw new Error(data.error || data.message || txt || 'Login failed');
      const token = data.token;
      if (token && typeof window !== 'undefined') localStorage.setItem('fjs_token', token);
      router.push('/seeker/dashboard');
    }catch(err){ setError(err?.message || 'Login failed'); }
    finally{ setLoading(false); }
  }

  return (
    <Layout title="Job Seeker — Login">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h2>Job Seeker login</h2>
          <form onSubmit={submit} className="mt-3">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} placeholder="you@example.com" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="password" />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={loading}>{loading? 'Signing in…' : 'Sign in'}</button>
              <Link href="/seeker/signup" className="btn btn-outline-secondary">Sign up</Link>
              <Link href="/" className="btn btn-secondary">Back to welcome</Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
