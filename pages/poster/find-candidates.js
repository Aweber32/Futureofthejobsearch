import Layout from '../../components/Layout';
import CandidateSwiper from '../../components/CandidateSwiper';
import AILoadingScreen from '../../components/AILoadingScreen';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { API_CONFIG } from '../../config/api';

export default function FindCandidates(){
  const router = useRouter();
  const { positionId } = router.query;
  const [candidates, setCandidates] = useState(null);

  useEffect(()=>{
    // Wait for router to be ready and positionId to be available
    if (!router.isReady) return;
    
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // ALWAYS require positionId - if not provided, show empty state
        if (!positionId) {
          if (!cancelled) setCandidates([]);
          return;
        }
        
        // fetch seekers - pass positionId for pre-filtering
        const seekersUrl = `${base}/api/seekers?positionId=${positionId}`;
        const res = await fetch(seekersUrl, { headers });
        if (!res.ok) throw new Error('no seekers');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.seekers || data);
        // Filter out seekers with inactive profiles
        const activeSeekers = Array.isArray(list) ? list.filter(seeker => seeker.isProfileActive !== false) : [];

        // if we have a positionId, fetch existing interest reviews and merge
        let merged = Array.isArray(activeSeekers) ? activeSeekers : [];
        if (positionId) {
          try{
            const r2 = await fetch(`${base}/api/seekerinterests?positionId=${positionId}`, { headers });
            if (r2.ok){
              const interests = await r2.json();
              const map = new Map();
              interests.forEach(i => map.set(i.seekerId ?? i.SeekerId ?? i.Seeker?.id ?? i.Seeker?.Id, i));
              merged = merged.map(s => ({ ...s, _interest: map.get(s.id ?? s.Id) }));
            }
          }catch(e){}
        }

        if (!cancelled) {
          // annotate candidates with positionId (as number) for reporting
          const posNum = positionId ? parseInt(Array.isArray(positionId) ? positionId[0] : positionId, 10) : null;
          const annotated = (merged || []).map(s => ({ ...s, _positionId: Number.isFinite(posNum) ? posNum : null }));
          setCandidates(annotated);
        }
      }catch(e){ /* ignore - CandidateSwiper will show empty */ }
    }
    load();
    return ()=>{ cancelled = true }
  },[router.isReady, positionId]);

  return (
    <Layout title="Find candidates">
      <div className="alert alert-info mb-3" role="alert">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Beta:</strong> Will show already reviewed profiles for testing purposes
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h2 className="mb-0">Candidate review</h2>
          <p className="text-muted mb-0">
            {positionId 
              ? 'Review profiles in a swipe-style flow and mark interest.' 
              : 'Select a position from your dashboard to review candidates.'}
          </p>
        </div>
        <div className="d-flex gap-2">
          {positionId && (
            <a 
              href={`/poster/position/${positionId}/preferences`} 
              className="btn d-flex align-items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                fontWeight: '500'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"></path>
              </svg>
              Set Preferences
            </a>
          )}
          <a href="/poster/dashboard" className="btn btn-outline-secondary">Return</a>
        </div>
      </div>

      {!positionId && router.isReady ? (
        <div className="text-center py-5">
          <p className="text-muted">No position selected. Please navigate from your dashboard.</p>
        </div>
      ) : (
        <div className="mb-3">
          {candidates === null ? <AILoadingScreen /> : <CandidateSwiper initialCandidates={candidates} />}
        </div>
      )}
    </Layout>
  )
}
