import { useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function Signup(){
  const [form, setForm] = useState({ companyName: 'Acme Co', email: 'hello@acme.test', contactName: 'Jane Doe' });
  return (
    <Layout title="Sign up — Employer">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h2>Create your employer account</h2>
          <form className="mt-3">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Company name</label>
                <input className="form-control" value={form.companyName} onChange={e=>setForm({...form, companyName: e.target.value})} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Contact email</label>
                <input className="form-control" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Contact name</label>
              <input className="form-control" value={form.contactName} onChange={e=>setForm({...form, contactName: e.target.value})} />
            </div>

            <div className="d-flex gap-2">
              <Link href="/poster/dashboard" className="btn btn-primary">Create account (placeholder)</Link>
              <Link href="/poster/login" className="btn btn-outline-secondary">Back to login</Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
