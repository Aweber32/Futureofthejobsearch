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
    // attempt to notify backend if endpoint exists, ignore failures
    try{
      const seekerId = candidate.id ?? candidate.Id ?? candidate.seekerId ?? candidate.SeekerId;
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
      await fetch(`${base}/api/seekerinterests`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ seekerId }) });
    }catch(e){}
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
              <p className="text-wrap">{top.professionalSummary ?? top.ProfessionalSummary ?? top.headline ?? top.Headline ?? 'No description provided.'}</p>
            </div>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between">
          <button className="btn btn-danger" onClick={()=>{ /* Not Interested action: remove and continue */ removeTop(); }}>Not Interested</button>
          <div>
            <button className="btn btn-success" onClick={()=>markInterested(top)}>Interested</button>
          </div>
        </div>
      </div>
      <div className="text-muted small">{stack.length} candidate(s) left</div>
    </div>
  )
}
