import Layout from '../../../../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../../../config/api';
import ChatButton from '../../../../components/ChatButton';

export default function PositionCandidates(){
  const router = useRouter();
  const { id } = router.query;
  const [list, setList] = useState(null);
  const [positionTitle, setPositionTitle] = useState('');

  useEffect(()=>{
    if (!id) return;
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
        const res = await fetch(`${base}/api/seekerinterests?positionId=${id}`);
        if (!res.ok) { setList([]); return; }
        const data = await res.json();
        // try to fetch position title once for the header subtitle
        try{
          const pres = await fetch(`${base}/api/positions/${id}`);
          if (pres.ok){
            const pjson = await pres.json();
            setPositionTitle(pjson.title ?? pjson.Title ?? pjson.positionTitle ?? '');
          }
        }catch(e){ /* ignore */ }
        if (!cancelled) setList(data || []);
      }catch(e){ if (!cancelled) setList([]); }
    }
    load();
    return ()=>{ cancelled = true; }
  },[id]);

  return (
    <Layout title="Reviewed candidates">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h2 className="mb-0">Reviewed candidates</h2>
          <p className="text-muted mb-0">Candidates reviewed for this position.</p>
        </div>
        <div>
          <Link href="/poster/dashboard" className="btn btn-outline-secondary">Return</Link>
        </div>
      </div>

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
             const seekerUserId = seeker.userId ?? seeker.UserId ?? null;
             const posId = parseInt(id, 10);
            return (
              <div key={r.id ?? r.Id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div><strong>{name.trim() || 'Candidate'}</strong></div>
                  <div className="small text-muted">Reviewed: {new Date(r.reviewedAt ?? r.ReviewedAt).toLocaleString()}</div>
                </div>
                <div className="d-flex align-items-center" style={{gap:12}}>
                  <div>{interested ? <span className="badge bg-success">Interested</span> : <span className="badge bg-secondary">Not interested</span>}</div>
                   <ChatButton title={name.trim() || 'Candidate Conversation'} subtitle={positionTitle || ''} otherUserId={seekerUserId} positionId={posId} />
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
