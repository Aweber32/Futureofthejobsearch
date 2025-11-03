import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { API_CONFIG } from '../../../config/api';

const API = API_CONFIG.BASE_URL;

export default function Billing(){
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token){ router.push('/poster/login'); return; }
    (async ()=>{
      try{
        const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        setEmail(data.user?.email || '');
      }catch{
        router.push('/poster/login');
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  if (loading) return <Layout title="Billing"><div className="text-center py-5">Loading…</div></Layout>;

  return (
    <Layout title="Billing">
      <div className="container py-4" style={{maxWidth: '900px'}}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0">Billing</h1>
          <span className="text-muted small">{email}</span>
        </div>

        <div className="row g-3 g-md-4">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h5 className="card-title">Current Plan</h5>
                <p className="text-muted mb-2">Free</p>
                <p className="mb-3">Upgrade options coming soon to post more roles and unlock premium sourcing.</p>
                <button className="btn btn-primary" disabled>Upgrade (soon)</button>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h5 className="card-title">Payment Method</h5>
                <p className="text-muted mb-3">No card on file</p>
                <button className="btn btn-outline-secondary" disabled>Add payment method (soon)</button>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h5 className="card-title">Invoices</h5>
                <p className="text-muted mb-0">No invoices yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
