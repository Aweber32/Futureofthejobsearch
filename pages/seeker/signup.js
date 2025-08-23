import { useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function SeekerSignup(){
  const [form, setForm] = useState({ name: 'Alex Seeker', email: 'alex@seeker.test' });
  return (
    <Layout title="Sign up — Job Seeker">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h2>Create your job seeker account</h2>
          <form className="mt-3">
            <div className="mb-3">
              <label className="form-label">Full name</label>
              <input className="form-control" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
            </div>

            <div className="d-flex gap-2">
              <Link href="/seeker/dashboard" className="btn btn-primary">Create account (placeholder)</Link>
              <Link href="/seeker/login" className="btn btn-outline-secondary">Back to login</Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
