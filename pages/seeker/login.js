import { useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function SeekerLogin(){
  const [form, setForm] = useState({ username: '', password: '' });
  return (
    <Layout title="Job Seeker — Login">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h2>Job Seeker login</h2>
          <form className="mt-3">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control" value={form.username} onChange={(e)=>setForm({...form, username: e.target.value})} placeholder="you@example.com" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="password" />
            </div>
            <div className="d-flex gap-2">
              <Link href="/seeker/dashboard" className="btn btn-primary">Login (placeholder)</Link>
              <Link href="/seeker/signup" className="btn btn-outline-secondary">Sign up</Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
