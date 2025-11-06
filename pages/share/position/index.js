import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../../config/api';
import PublicPositionCard from '../../../components/PublicPositionCard';

const API = API_CONFIG.BASE_URL;

export default function PublicPositionPage(){
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const t = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('t') : null;
    if (!t){ setError('Missing token'); setLoading(false); return; }
    (async ()=>{
      try{
        const res = await fetch(`${API}/api/positions/public/by-token?t=${encodeURIComponent(t)}`);
        if (!res.ok){ const txt = await res.text(); throw new Error(txt || 'Failed to load'); }
        const data = await res.json();
        setJob(data);
      }catch(err){ setError(err?.message || 'Failed to load'); }
      finally{ setLoading(false); }
    })();
  },[]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Fixed CTA */}
      <a
        href="/"
        className="btn btn-primary"
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}
      >
        Want to see more?
      </a>

      <div className="container" style={{ maxWidth: 900, margin: '80px auto 40px', padding: '0 16px' }}>
        {loading && <div className="text-center py-5">Loading…</div>}
        {!loading && error && (
          <div className="alert alert-danger">{error}</div>
        )}
        {!loading && !error && job && <PublicPositionCard job={job} />}
      </div>
    </div>
  );
}
