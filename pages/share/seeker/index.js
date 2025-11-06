import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import PublicSeekerCard from '../../../components/PublicSeekerCard';
import { API_CONFIG } from '../../../config/api';

const API = API_CONFIG.BASE_URL;

export default function PublicSeekerTokenPage(){
  const router = useRouter();
  const { t } = router.query;
  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!t) return;
    let cancelled = false;
    (async () => {
      try{
        const res = await fetch(`${API}/api/seekers/public/by-token?t=${encodeURIComponent(t)}`);
        if (!res.ok){
          const txt = await res.text();
          throw new Error(txt || 'Link invalid or expired');
        }
        const data = await res.json();
        if (!cancelled) setSeeker(data);
      }catch(err){
        if (!cancelled) setError(err?.message || 'Unable to load profile');
      }finally{
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; }
  }, [t]);

  // Bare page (no global header/footer)
  return (
    <div style={{minHeight:'100vh', background:'#f3f4f6', padding:'24px'}}>
      <style jsx global>{`
        html, body, #__next { height: 100%; }
        body { margin: 0; }
      `}</style>
      {/* Fixed top-right CTA that stays visible while scrolling */}
      <div style={{ position:'fixed', top: '16px', right: '16px', zIndex: 2000 }}>
        <button className="btn btn-primary" onClick={()=>router.push('/')}>Want to see more!</button>
      </div>
      <div className="container" style={{maxWidth:'860px', margin:'0 auto'}}>
        {loading && (
          <div className="text-center py-5">Loading…</div>
        )}
        {!loading && error && (
          <div className="py-5">
            <div className="alert alert-danger mx-auto" style={{maxWidth:'640px'}}>{error}</div>
            <div className="text-center">
              <button className="btn btn-primary" onClick={()=>router.push('/')}>Go to homepage</button>
            </div>
          </div>
        )}
        {!loading && !error && seeker && (
          <div>
            <PublicSeekerCard seeker={seeker} />
          </div>
        )}
      </div>
    </div>
  );
}
