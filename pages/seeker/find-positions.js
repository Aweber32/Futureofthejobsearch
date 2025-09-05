import Layout from '../../components/Layout'
import PositionSwiper from '../../components/PositionSwiper'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function FindPositions(){
  const [positions, setPositions] = useState(null);

  useEffect(()=>{
    let cancelled = false;
    async function load(){
      try{
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
        const res = await fetch(`${base}/api/positions`);
        if (!res.ok){ setPositions([]); return; }
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.positions || data);

        // try to fetch any existing seeker-side interests so the swiper can PATCH instead of creating duplicates
        try{
          const q = new URLSearchParams(window.location.search).get('positionId');
          const r2 = await fetch(`${base}/api/positioninterests?`);
          if (r2.ok){
            const ints = await r2.json();
            const interests = Array.isArray(ints) ? ints : (ints.positionInterests || ints);
            const map = new Map();
            (interests||[]).forEach(i => map.set(i.positionId ?? i.PositionId ?? i.Position?.id ?? i.Position?.Id, i));
            const merged = (list||[]).map(p => ({ ...p, _interest: map.get(p.id ?? p.Id) || null }));
            if (!cancelled) setPositions(merged);
            return;
          }
        }catch(e){ /* ignore */ }

        if (!cancelled) setPositions(Array.isArray(list) ? list : []);
      }catch(err){ if (!cancelled) setPositions([]); }
    }
    load();
    return ()=>{ cancelled = true; }
  },[]);

  return (
    <Layout title="Find Positions">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Find Positions</h2>
        <div>
          <Link href="/seeker/dashboard" className="btn btn-outline-secondary">Return</Link>
        </div>
      </div>

      <div className="mb-3">
        {positions === null ? <div>Loading…</div> : <PositionSwiper initialPositions={positions} />}
      </div>
    </Layout>
  )
}
// ...existing code above retained
