import { useEffect, useState } from 'react';
import Link from 'next/link';
import PositionReviewModal from './PositionReviewModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function InterestedPositionsList({ seeker }){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePosition, setActivePosition] = useState(null);

  useEffect(()=>{
    if (!seeker) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { setError('Not authenticated'); setLoading(false); return; }

    (async ()=>{
      try{
        // fetch all position interests for the current seeker
        const res = await fetch(`${API}/api/positioninterests`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load interests');
        const data = await res.json();
        // filter for this seeker and interested=true
        const my = (data || []).filter(i => (i.seekerId === seeker.id || i.seekerId === seeker.SeekerId || i.seekerId === seeker.seekerId) && i.interested === true);

        // try to normalize position details: some APIs may include a nested position
        const normalized = await Promise.all(my.map(async i => {
          if (i.position) return { id: i.position.id ?? i.position.Id ?? i.position.positionId, title: i.position.title ?? i.position.Title ?? i.position.jobTitle, raw: i, position: i.position };
          // otherwise fetch basic position data
          try{
            const pres = await fetch(`${API}/api/positions/${i.positionId ?? i.positionID ?? i.PositionId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (pres.ok) {
              const pjson = await pres.json();
              return { id: pjson.id ?? pjson.Id, title: pjson.title ?? pjson.Title ?? pjson.jobTitle ?? pjson.positionTitle, raw: i, position: pjson };
            }
          }catch{}
          return { id: i.positionId ?? i.PositionId ?? i.positionID, title: i.positionTitle ?? 'Position', raw: i };
        }));

        // For each normalized item, fetch poster-side SeekerInterest to determine employer's decision
        const withStatus = await Promise.all(normalized.map(async it => {
          try{
            const pid = it.id;
            if (!pid) return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
            const sres = await fetch(`${API}/api/seekerinterests?positionId=${pid}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!sres.ok) return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
            const slist = await sres.json();
            // find record for this seeker
            const match = (slist || []).find(si => si.seekerId === seeker.id || si.SeekerId === seeker.SeekerId || si.seekerId === seeker.seekerId || si.SeekerId === seeker.id);
            if (!match) return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
            const status = match.interested === true ? 'Job-Poster Status: Interested' : 'Job-Poster Status: Not-Interested';
            return { ...it, posterStatus: status };
          }catch{
            return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
          }
        }));

        setItems(withStatus);
      }catch(err){ setError(err?.message || 'Failed to load'); }
      finally{ setLoading(false); }
    })();
  },[seeker]);

  if (loading) return <div>Loading interested positions…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!items.length) return <div>No interested positions yet. Use <Link href="/seeker/find-positions">Find Positions</Link> to swipe.</div>;

  return (
    <div className="list-group">
      {items.map(item => (
        <div key={item.id || JSON.stringify(item.raw)} className="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <div className="fw-bold">{item.title || 'Position'}</div>
            {item.position?.companyName && <div className="text-muted">{item.position.companyName}</div>}
          </div>
          <div className="text-end">
            {/* posterStatus may be one of: 'Job-Poster Status: Interested', 'Job-Poster Status: Not-Interested', or Unreviewed */}
            {(() => {
              const raw = item.posterStatus ?? 'Job-Poster Status: Unreviewed';
              const ps = raw.replace('Not-Intrested', 'Not-Interested');
              const psLower = ps.toLowerCase();
              // badge classes: green = interested, dark gray = not-interested, gray = unreviewed
              let badgeClass = 'bg-secondary text-dark';
              if (psLower.includes('not-interested')) badgeClass = 'bg-dark text-white';
              else if (psLower.includes('interested')) badgeClass = 'bg-success text-white';
              return (
                <div className="d-flex align-items-center justify-content-end">
                  <span className={`badge ${badgeClass} me-2`} style={{borderRadius: '0.75rem'}}>{ps}</span>
                  <button onClick={()=> setActivePosition(item.position ?? { id: item.id, title: item.title, description: item.position?.description ?? item.raw?.description })} className="btn btn-sm btn-outline-primary">Review position</button>
                </div>
              );
            })()}
          </div>
        </div>
      ))}
      {activePosition && <PositionReviewModal position={activePosition} onClose={()=>setActivePosition(null)} />}
    </div>
  );
}
