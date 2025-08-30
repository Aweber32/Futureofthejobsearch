import Layout from '../../components/Layout';
import CandidateSwiper from '../../components/CandidateSwiper';
import { useEffect, useState } from 'react';

export default function FindCandidates(){
  const [candidates, setCandidates] = useState(null);

  useEffect(()=>{
    let cancelled = false;
    async function load(){
      try{
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
        const res = await fetch(`${base}/api/seekers`);
        if (!res.ok) throw new Error('no seekers');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.seekers || data);
        if (!cancelled) setCandidates(list);
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
