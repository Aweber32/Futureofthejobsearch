import { useState, useEffect } from 'react'

export default function PositionSwiper({ initialPositions }){
  const [stack, setStack] = useState(initialPositions || []);
  const [loading, setLoading] = useState(!initialPositions);

  useEffect(()=>{
    if (initialPositions && initialPositions.length>0) return;
    let cancelled = false;
    async function load(){
      try{
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
        const res = await fetch(`${base}/api/positions`);
        if (!res.ok) { setStack([]); return; }
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data.positions || data);
        setStack(Array.isArray(list) ? list : []);
      }catch(err){ if (!cancelled) setStack([]); }
      finally{ if (!cancelled) setLoading(false); }
    }
    load();
    return ()=>{ cancelled = true; }
  },[initialPositions]);

  function removeTop(){ setStack(s => s.slice(1)); }

  async function markInterested(position){
    try{
      let positionId = position.id ?? position.Id ?? position.positionId ?? position.PositionId;
      positionId = parseInt(positionId,10);
      if (!Number.isFinite(positionId)) throw new Error('invalid positionId');
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const existingId = position._interest?.id ?? position._interest?.Id ?? null;
      if (existingId){
        await fetch(`${base}/api/positioninterests/${existingId}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ interested: true }) });
      } else {
        await fetch(`${base}/api/positioninterests`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ positionId, interested: true }) });
      }
    }catch(e){ /* non-blocking */ }
    removeTop();
  }

  async function markNotInterested(position){
    try{
      let positionId = position.id ?? position.Id ?? position.positionId ?? position.PositionId;
      positionId = parseInt(positionId,10);
      if (!Number.isFinite(positionId)) throw new Error('invalid positionId');
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const existingId = position._interest?.id ?? position._interest?.Id ?? null;
      if (existingId){
        await fetch(`${base}/api/positioninterests/${existingId}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ interested: false }) });
      } else {
        await fetch(`${base}/api/positioninterests`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ positionId, interested: false }) });
      }
    }catch(e){ }
    removeTop();
  }

  const top = stack && stack.length ? stack[0] : null;

  if (loading) return <div className="text-center">Loading positions…</div>
  if (!top) return <div className="alert alert-secondary">No more positions</div>

  const title = top.title ?? top.Title ?? top.jobTitle ?? 'Position';
  const employer = top.employer ?? top.Employer ?? top.company ?? {};
  const skillsRaw = top.skillsList ?? top.SkillsList ?? top.skills ?? top.Skills ?? '';
  const skillsArr = Array.isArray(skillsRaw) ? skillsRaw.map(s=>s.skill ?? s.Skill ?? s) : (typeof skillsRaw === 'string' && skillsRaw.length ? skillsRaw.split(',').map(s=>s.trim()).filter(Boolean) : []);

  return (
    <div className="position-swiper">
      <div className="card mb-3">
        <div style={{display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:6}}>
          {top.posterVideoUrl ? (
            <video src={top.posterVideoUrl} controls style={{width:320, height:380, objectFit:'cover', borderRadius:6}} />
          ) : (
            <div style={{width:320, height:380, display:'flex', alignItems:'center', justifyContent:'center'}}>No video</div>
          )}
        </div>
        <div className="card-body">
          <h4 className="card-title">{title}</h4>
          <p className="text-muted mb-1">{employer?.name ?? employer?.Name ?? ''}</p>
          <h6>Skills</h6>
          <div className="d-flex flex-wrap" style={{gap:6}}>
            {skillsArr.map((s,idx)=> (
              <span key={idx} className="badge bg-light text-dark me-1 mb-1">{s.skill ?? s.Skill ?? s}</span>
            ))}
          </div>
          <hr />
          <div>
            <p>{top.description ?? top.Description ?? 'No description provided.'}</p>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between">
          <button className="btn btn-danger" onClick={()=>markNotInterested(top)}>Not Interested</button>
          <div>
            <button className="btn btn-success" onClick={()=>markInterested(top)}>Interested</button>
          </div>
        </div>
      </div>
      <div className="text-muted small">{stack.length} position(s) left</div>
    </div>
  )
}
