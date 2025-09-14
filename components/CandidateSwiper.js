import { useState, useEffect } from 'react'

export default function CandidateSwiper({ initialCandidates }){
  const [stack, setStack] = useState(initialCandidates || []);
  const [loading, setLoading] = useState(!initialCandidates);

  useEffect(()=>{
    if (initialCandidates && initialCandidates.length>0) return;
    // load real seekers from backend; do NOT use mock data
    let cancelled = false;
    async function load(){
      try{
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
        const res = await fetch(`${base}/api/seekers`);
        if (!res.ok) {
          setStack([]);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        // expect array of seekers or {seekers: [...]}
        const list = Array.isArray(data) ? data : (data.seekers || data);
        setStack(Array.isArray(list) ? list : []);
      }catch(err){
        // on error, show empty list — user asked for real data only
        if (!cancelled) setStack([]);
      }finally{ if (!cancelled) setLoading(false); }
    }
    load();
    return ()=>{ cancelled = true; }
  },[initialCandidates]);

  function removeTop(){
    setStack(s => s.slice(1));
  }

  async function markInterested(candidate){
    try{
      let seekerId = candidate.id ?? candidate.Id ?? candidate.seekerId ?? candidate.SeekerId;
      let positionId = candidate._positionId ?? candidate.positionId ?? candidate.PositionId;
      // fallback: try to read from URL query if not present on candidate
      if (!positionId && typeof window !== 'undefined'){
        const qp = new URLSearchParams(window.location.search).get('positionId');
        if (qp) positionId = qp;
      }
      seekerId = parseInt(seekerId, 10);
      positionId = parseInt(positionId, 10);
      if (!Number.isFinite(seekerId)) throw new Error('invalid seekerId');
      if (!Number.isFinite(positionId)){
        // positionId missing — skip API call and advance stack
        removeTop();
        return;
      }
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const existingId = candidate._interest?.id ?? candidate._interest?.Id ?? null;
      if (existingId){
        await fetch(`${base}/api/seekerinterests/${existingId}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ interested: true }) });
      } else {
        await fetch(`${base}/api/seekerinterests`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ seekerId, positionId, interested: true }) });
      }
    }catch(e){
      // swallow errors -- we're intentionally non-blocking in the swiper
    }
    removeTop();
  }

  async function markNotInterested(candidate){
    try{
      let seekerId = candidate.id ?? candidate.Id ?? candidate.seekerId ?? candidate.SeekerId;
      let positionId = candidate._positionId ?? candidate.positionId ?? candidate.PositionId;
      // fallback: try to read from URL query if not present on candidate
      if (!positionId && typeof window !== 'undefined'){
        const qp = new URLSearchParams(window.location.search).get('positionId');
        if (qp) positionId = qp;
      }
      seekerId = parseInt(seekerId, 10);
      positionId = parseInt(positionId, 10);
      if (!Number.isFinite(seekerId)) throw new Error('invalid seekerId');
      if (!Number.isFinite(positionId)){
        // positionId missing — skip API call and advance stack
        removeTop();
        return;
      }
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const existingId = candidate._interest?.id ?? candidate._interest?.Id ?? null;
      if (existingId){
        await fetch(`${base}/api/seekerinterests/${existingId}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ interested: false }) });
      } else {
        await fetch(`${base}/api/seekerinterests`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ seekerId, positionId, interested: false }) });
      }
    }catch(e){
      // swallow errors -- keep swiper flow uninterrupted
    }
    removeTop();
  }

  const top = stack && stack.length ? stack[0] : null;

  if (loading) return <div className="text-center">Loading candidates…</div>
  if (!top) return <div className="alert alert-secondary">No more candidates</div>

  // normalize name and skills (DB may store skills as comma string)
  const first = top.firstName ?? top.FirstName ?? top.name ?? top.Name ?? '';
  const last = top.lastName ?? top.LastName ?? '';
  const name = `${first} ${last}`.trim();
  const rawSkills = top.skills ?? top.Skills ?? '';
  const skillsArr = Array.isArray(rawSkills) ? rawSkills : (typeof rawSkills === 'string' && rawSkills.length ? rawSkills.split(',').map(s=>s.trim()).filter(Boolean) : []);

  return (
    <div className="candidate-swiper">
      <div className="card mb-3">
        <div style={{display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:6, background:'#000'}}>
          {top.videoUrl ? (
            // vertical rectangle video (not too big)
            <video src={top.videoUrl} controls style={{width:320, height:480, objectFit:'cover', borderRadius:6}} />
          ) : (
            <div style={{width:320, height:480, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>No video</div>
          )}
        </div>
        <div className="card-body">
          <h4 className="card-title">{name || 'Candidate'}</h4>
          <div className="row">
            <div className="col-md-4">
              <div className="mb-2">
                <h6>Skills</h6>
                <div className="d-flex flex-wrap" style={{gap:6}}>
                  {skillsArr.map((s,idx)=> (
                    <span key={idx} className="badge bg-light text-dark me-1 mb-1">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <a className="btn btn-outline-secondary btn-sm" href={top.resumeUrl || '#'} target="_blank" rel="noreferrer">View Resume</a>
              </div>
            </div>
            <div className="col-md-8">
              <h6>Description</h6>
              <p className="text-wrap">{top.headline ?? top.Headline ?? 'No description provided.'}</p>
            </div>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between">
          <button className="btn btn-danger" onClick={()=>{ /* Not Interested action: remove and continue */ markNotInterested(top); }}>Not Interested</button>
          <div>
            <button className="btn btn-success" onClick={()=>markInterested(top)}>Interested</button>
          </div>
        </div>
      </div>
      <div className="text-muted small">{stack.length} candidate(s) left</div>
    </div>
  )
}
