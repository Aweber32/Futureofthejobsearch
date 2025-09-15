import { useState, useEffect } from 'react'

export default function PositionSwiper({ initialPositions }){
  const [stack, setStack] = useState(initialPositions || []);
  const [loading, setLoading] = useState(!initialPositions);
  const [showFullDescription, setShowFullDescription] = useState(false);

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

  // Extract position data with correct API structure
  const title = top.title ?? top.Title ?? top.jobTitle ?? 'Position';
  const companyName = top.employer?.companyName ?? top.employer?.CompanyName ?? 'Company not specified';
  const companyLogo = top.employer?.logoUrl ?? top.employer?.LogoUrl ?? null;
  const companyDescription = top.employer?.companyDescription ?? top.employer?.CompanyDescription ?? 'A great company to work for.';
  const companyWebsite = top.employer?.companyWebsite ?? top.employer?.CompanyWebsite ?? 'https://example.com';
  const companySize = top.employer?.companySize ?? top.employer?.CompanySize ?? null;
  const city = top.employer?.city ?? top.employer?.City ?? 'City';
  const state = top.employer?.state ?? top.employer?.State ?? 'State';

  // Extract requirements data from nested objects
  const educationArr = Array.isArray(top.educations) ? 
                      top.educations.map(edu => edu.education ?? edu.Education ?? edu).filter(Boolean) : [];
  
  const experiencesArr = Array.isArray(top.experiences) ? 
                         top.experiences.map(exp => exp.experience ?? exp.Experience ?? exp).filter(Boolean) : [];
  
  const skillsArr = Array.isArray(top.skillsList) ? 
                    top.skillsList.map(skill => skill.skill ?? skill.Skill ?? skill).filter(Boolean) : [];

  // Helper functions
  const formatCompanySize = (size) => {
    if (size === null || size === undefined) return 'Company size not specified';
    if (!size && size !== 0) return 'Company size not specified';
    const parsedSize = parseInt(size);
    switch (parsedSize) {
      case 0: return '<500 employees';
      case 1: return '500-1000 employees';
      case 2: return '1000+ employees';
      default: return 'Company size not specified';
    }
  };

  const formatSalary = () => {
    if (top.salaryType === 'None' || !top.salaryMin) return 'Salary not specified';
    const min = new Intl.NumberFormat('en-US').format(top.salaryMin);
    const max = top.salaryMax ? ` - $${new Intl.NumberFormat('en-US').format(top.salaryMax)}` : '';
    const period = top.salaryType?.toLowerCase() ?? '';
    return `$${min}${max} ${period}`;
  };

  const shouldShowMore = (text) => {
    return text && text.length > 500;
  };

  const description = top.description ?? top.Description ?? 'No description provided.';

  return (
    <div className="position-swiper">
      <div className="card border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden', maxWidth: '800px', margin: '0 auto' }}>
        {/* Top Section - Bumble Style Gradient Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="row align-items-center">
            {/* Left: Company Logo */}
            <div className="col-auto">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={`${companyName} logo`}
                  className="rounded-circle border border-white border-3"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  }}
                />
              ) : (
                <div
                  className="rounded-circle bg-white bg-opacity-20 d-flex align-items-center justify-content-center fw-bold fs-3 border border-white border-3"
                  style={{
                    width: '80px',
                    height: '80px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  {companyName.charAt(0)}
                </div>
              )}
            </div>

            {/* Right: Job Info */}
            <div className="col">
              <h3 className="fw-bold mb-1 fs-4">{title}</h3>
              <h5 className="fw-semibold mb-1 text-light">{companyName}</h5>
              <p className="mb-0 text-white-50 small">
                <i className="fas fa-map-marker-alt me-1"></i>
                {city}, {state}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="modal-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Two Column Layout */}
          <div className="row g-0">
            {/* Left Column - Job Description */}
            <div className="col-md-7 p-4 border-end">
              <h5 className="fw-bold mb-3 text-dark">
                <i className="fas fa-file-alt me-2 text-primary"></i>
                Job Description
              </h5>
              <div className="text-muted">
                {showFullDescription || !shouldShowMore(description) ? (
                  <div dangerouslySetInnerHTML={{
                    __html: description.replace(/\n/g, '<br>')
                  }} />
                ) : (
                  <div dangerouslySetInnerHTML={{
                    __html: description.substring(0, 500) + '...'
                  }} />
                )}

                {shouldShowMore(description) && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="btn btn-link p-0 mt-2 text-primary fw-semibold"
                  >
                    {showFullDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Requirements */}
            <div className="col-md-5 p-4 bg-light">
              {/* Education Requirements */}
              {educationArr.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-3 text-dark">
                    <i className="fas fa-graduation-cap me-2 text-success"></i>
                    Education Requirements
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {educationArr.map((edu, index) => (
                      <span key={index} className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2">
                        {typeof edu === 'string' ? edu : (edu?.name ?? edu?.title ?? JSON.stringify(edu))}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Requirements */}
              {experiencesArr.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-3 text-dark">
                    <i className="fas fa-briefcase me-2 text-info"></i>
                    Experience Requirements
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {experiencesArr.map((exp, index) => (
                      <span key={index} className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2">
                        {typeof exp === 'string' ? exp : (exp?.name ?? exp?.title ?? JSON.stringify(exp))}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {skillsArr.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-3 text-dark">
                    <i className="fas fa-star me-2 text-warning"></i>
                    Skills
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {skillsArr.map((skill, index) => (
                      <span key={index} className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2">
                        {typeof skill === 'string' ? skill : (skill?.name ?? skill?.title ?? JSON.stringify(skill))}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Salary */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3 text-dark">
                  <i className="fas fa-dollar-sign me-2 text-success"></i>
                  Salary
                </h6>
                <p className="h5 text-success fw-bold mb-0">{formatSalary()}</p>
              </div>
            </div>
          </div>

          {/* Video Section */}
          {top.posterVideoUrl && (
            <div className="p-4 bg-white">
              <h5 className="fw-bold mb-3 text-dark">
                <i className="fas fa-video me-2 text-danger"></i>
                Company Video
              </h5>
              <div className="ratio ratio-16x9 bg-light rounded-3 overflow-hidden shadow-sm">
                <video
                  controls
                  className="w-100 h-100"
                  style={{ objectFit: 'contain' }}
                >
                  <source src={top.posterVideoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Bottom Section - Additional Info */}
          <div className="p-4 bg-light border-top">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="text-center">
                  <i className="fas fa-building fa-2x text-primary mb-2"></i>
                  <h6 className="fw-bold text-dark mb-1">Work Setting</h6>
                  <p className="text-muted mb-0">{top.workSetting ?? 'Not specified'}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <i className="fas fa-plane fa-2x text-info mb-2"></i>
                  <h6 className="fw-bold text-dark mb-1">Travel Requirements</h6>
                  <p className="text-muted mb-0">{top.travel ?? 'None'}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <i className="fas fa-users fa-2x text-success mb-2"></i>
                  <h6 className="fw-bold text-dark mb-1">Company Size</h6>
                  <p className="text-muted mb-0">{formatCompanySize(companySize)}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <i className="fas fa-briefcase fa-2x text-warning mb-2"></i>
                  <h6 className="fw-bold text-dark mb-1">Employment Type</h6>
                  <p className="text-muted mb-0">{top.employmentType ?? 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="bg-white border-top p-3">
          <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
            <button 
              className="btn btn-outline-danger flex-fill" 
              onClick={()=>markNotInterested(top)}
              style={{minHeight: '44px'}}
            >
              Not Interested
            </button>
            <button 
              className="btn btn-success flex-fill" 
              onClick={()=>markInterested(top)}
              style={{minHeight: '44px'}}
            >
              I'm Interested
            </button>
          </div>
        </div>
      </div>
      <div className="text-muted small mt-2">{stack.length} position(s) left</div>
    </div>
  )
}
