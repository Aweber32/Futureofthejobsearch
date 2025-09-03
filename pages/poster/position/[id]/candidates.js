import Layout from '../../../../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PositionCandidates(){
  const router = useRouter();
  const { id } = router.query;
  const [list, setList] = useState(null);

  useEffect(()=>{
    if (!id) return;
    let cancelled = false;
    async function load(){
      try{
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
        const res = await fetch(`${base}/api/seekerinterests?positionId=${id}`);
        if (!res.ok) { setList([]); return; }
        const data = await res.json();
        if (!cancelled) setList(data || []);
      }catch(e){ if (!cancelled) setList([]); }
    }
    load();
    return ()=>{ cancelled = true; }
  },[id]);

  return (
    <Layout title="Reviewed candidates">
      <h2>Reviewed candidates</h2>
      <p className="text-muted">Candidates reviewed for this position.</p>

      {!list ? (
        <div className="text-center">Loading…</div>
      ) : list.length === 0 ? (
        <div className="alert alert-secondary">No reviews yet for this position.</div>
      ) : (
        <div className="list-group">
          {list.map(r => {
            const seeker = r.seeker ?? r.Seeker ?? {};
            const name = (seeker.firstName ?? seeker.FirstName ?? seeker.name ?? seeker.Name ?? '') + ' ' + (seeker.lastName ?? seeker.LastName ?? '');
            const interested = !!r.interested ?? !!r.Interested;
            return (
              <div key={r.id ?? r.Id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div><strong>{name.trim() || 'Candidate'}</strong></div>
                  <div className="small text-muted">Reviewed: {new Date(r.reviewedAt ?? r.ReviewedAt).toLocaleString()}</div>
                </div>
                <div className="d-flex align-items-center" style={{gap:12}}>
                  <div>{interested ? <span className="badge bg-success">Interested</span> : <span className="badge bg-secondary">Not interested</span>}</div>
                  <Link href={`/poster/candidate/${seeker.id ?? seeker.Id}?positionId=${id}`} className="btn btn-sm btn-outline-primary">Review</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
