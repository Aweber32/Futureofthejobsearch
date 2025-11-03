import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { API_CONFIG } from '../../../config/api';

const API = API_CONFIG.BASE_URL;

export default function PosterAnalytics(){
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token){ router.push('/poster/login'); return; }
    (async ()=>{
      try{
        const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Unauthorized');
      }catch{
        router.push('/poster/login');
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  if (loading) return <Layout title="Analytics"><div className="text-center py-5">Loading…</div></Layout>;

  return (
    <Layout title="Analytics">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Analytics</h2>
        <Link href="/poster/dashboard" className="btn btn-outline-secondary">Return</Link>
      </div>
      <div className="card shadow-sm border-0" style={{borderRadius: '12px'}}>
        <div className="card-body">
          <p className="mb-0 text-muted">Analytics coming soon. You'll see job views, candidate interactions, and funnel stats here.</p>
        </div>
      </div>
    </Layout>
  );
}
