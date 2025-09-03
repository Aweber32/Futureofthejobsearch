import Layout from '../../components/Layout';
import CandidateSwiper from '../../components/CandidateSwiper';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function FindCandidates(){
  const router = useRouter();
  const { positionId } = router.query;
  const [candidates, setCandidates] = useState(null);

  useEffect(()=>{
    let cancelled = false;
    async function load(){
      try{
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
        // fetch seekers
        const res = await fetch(`${base}/api/seekers`);
        if (!res.ok) throw new Error('no seekers');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.seekers || data);

        // if we have a positionId, fetch existing interest reviews and merge
        let merged = Array.isArray(list) ? list : [];
        if (positionId) {
          try{
            const r2 = await fetch(`${base}/api/seekerinterests?positionId=${positionId}`);
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
  },[]);

  return (
    <Layout title="Find candidates">
      <h2>Candidate review</h2>
      <p className="text-muted">Review profiles in a swipe-style flow and mark interest.</p>

      <CandidateSwiper initialCandidates={candidates} />
    </Layout>
  )
}
