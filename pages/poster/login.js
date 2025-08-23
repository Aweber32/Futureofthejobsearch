import { useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function Login(){
  const [form, setForm] = useState({ username: '', password: '' });
  return (
    <Layout title="Job Poster — Login">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h2>Employer login</h2>
          <form className="mt-3">
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input className="form-control" value={form.username} onChange={(e)=>setForm({...form, username: e.target.value})} placeholder="company@example.com" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="password" />
            </div>
            <div className="d-flex gap-2">
              <Link href="/poster/dashboard" className="btn btn-primary">Login (placeholder)</Link>
              <Link href="/poster/signup" className="btn btn-outline-secondary">Sign up</Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
