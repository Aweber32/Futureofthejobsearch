import Layout from '../../components/Layout';
import CandidateSwiper from '../../components/CandidateSwiper';
import AILoadingScreen from '../../components/AILoadingScreen';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { API_CONFIG } from '../../config/api';

export default function FindCandidates(){
  const router = useRouter();
  const [candidates, setCandidates] = useState(null);
  const [positionId, setPositionId] = useState(null);

  // Capture positionId from URL then clean it
  useEffect(() => {
    if (router.isReady && router.query.positionId) {
      const pid = router.query.positionId;
      setPositionId(pid); // Store it in state
      router.replace('/poster/find-candidates', undefined, { shallow: true }); // Clean URL
    }
  }, [router.isReady, router.query.positionId]);

  useEffect(()=>{
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // fetch seekers with optional positionId for filtering
        const seekersUrl = positionId 
          ? `${base}/api/seekers?positionId=${positionId}`
          : `${base}/api/seekers`;
        const res = await fetch(seekersUrl, { headers });
        if (!res.ok) throw new Error('no seekers');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.seekers || data);
        // Filter out seekers with inactive profiles
        const activeSeekers = Array.isArray(list) ? list.filter(seeker => seeker.isProfileActive !== false) : [];

        // fetch existing interest reviews and merge
        try{
          const r2 = await fetch(`${base}/api/seekerinterests`, { headers });
          if (r2.ok){
            const interests = await r2.json();
            const map = new Map();
            (interests||[]).forEach(i => map.set(i.seekerId ?? i.SeekerId ?? i.Seeker?.id ?? i.Seeker?.Id, i));
            const merged = (activeSeekers||[]).map(s => ({ ...s, _interest: map.get(s.id ?? s.Id) || null }));
            if (!cancelled) setCandidates(merged);
            return;
          }
        }catch(e){ /* ignore */ }

        if (!cancelled) setCandidates(Array.isArray(activeSeekers) ? activeSeekers : []);
      }catch(e){ /* ignore - CandidateSwiper will show empty */ }
    }
    load();
    return ()=>{ cancelled = true }
  },[positionId]); // Re-fetch if positionId changes

  return (
    <Layout title="Find candidates">
      <div className="alert alert-info mb-3" role="alert">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Beta:</strong> Will show already reviewed profiles for testing purposes
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">Candidate review</h2>
        <div>
          <a href="/poster/dashboard" className="btn btn-outline-secondary btn-sm">Return</a>
        </div>
      </div>

      <div className="mb-3">
        {candidates === null ? <AILoadingScreen /> : <CandidateSwiper initialCandidates={candidates} />}
      </div>
    </Layout>
  )
}
