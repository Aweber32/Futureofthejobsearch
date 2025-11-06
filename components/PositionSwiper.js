import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_CONFIG } from '../config/api'
import { useSignedBlobUrl } from '../utils/blobHelpers'
import { sanitizeDescription } from '../utils/sanitize'

export default function PositionSwiper({ initialPositions, onInterested, onNotInterested }){
  const [stack, setStack] = useState(initialPositions || []);
  const [loading, setLoading] = useState(!initialPositions);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [exitDirection, setExitDirection] = useState(null); // 'left' | 'right' | null
  const [shareBusy, setShareBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const top = stack && stack.length ? stack[0] : null;
  
  // Sign blob URLs (hooks must be called unconditionally)
  const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  const companyLogoRaw = top?.employer?.logoUrl ?? top?.employer?.LogoUrl ?? null;
  const { signedUrl: companyLogo, loading: logoLoading } = useSignedBlobUrl(companyLogoRaw, token);
  const posterVideoRaw = top?.posterVideoUrl ?? top?.PosterVideoUrl ?? null;
  const { signedUrl: posterVideo, loading: videoLoading } = useSignedBlobUrl(posterVideoRaw, token);
  
  // Determine if current user is an employer (to allow sharing jobs)
  function base64UrlDecode(str){
    try{
      const pad = (s)=> s + '='.repeat((4 - (s.length % 4)) % 4);
      const b64 = pad(str.replace(/-/g, '+').replace(/_/g, '/'));
      const decoded = typeof window !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
      // Convert binary string to UTF-8
      if (typeof window === 'undefined') return decoded;
      const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }catch{ return null; }
  }
  function parseJwt(t){
    try{
      if (!t || typeof t !== 'string' || !t.includes('.')) return null;
      const [, payload] = t.split('.');
      const json = base64UrlDecode(payload);
      return json ? JSON.parse(json) : null;
    }catch{ return null; }
  }
  const claims = parseJwt(token);
  
  console.log('[PositionSwiper] Blob URLs:', { 
    companyLogoRaw, 
    companyLogo, 
    logoLoading,
    posterVideoRaw, 
    posterVideo,
    videoLoading
  });

  useEffect(()=>{
    if (initialPositions && initialPositions.length>0) return;
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
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

  // Animation variants for smooth enter/center/exit transitions
  const swipeVariants = {
    enter: { x: 0, y: 12, scale: 0.98, opacity: 0.9 },
    center: { x: 0, y: 0, scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 30, mass: 0.9 } },
    exitRight: { x: 520, rotate: 6, opacity: 0, transition: { type: 'spring', stiffness: 260, damping: 22, mass: 0.85 } },
    exitLeft: { x: -520, rotate: -6, opacity: 0, transition: { type: 'spring', stiffness: 260, damping: 22, mass: 0.85 } }
  };

  function handleInterested(){
    if (!top || exitDirection) return;
    setExitDirection('right');
    // Fire network update optimistically
    markInterested(top);
    // Notify parent immediately
    try { if (typeof onInterested === 'function') onInterested(top); } catch(_){}
    // Remove the card on next frame so exit animation can read latest state
    requestAnimationFrame(() => {
      removeTop();
      // Scroll to top for next position
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // Reset exit direction after animation window
    setTimeout(() => setExitDirection(null), 500);
  }

  function handleNotInterested(){
    if (!top || exitDirection) return;
    setExitDirection('left');
    // Fire network update optimistically
    markNotInterested(top);
    // Notify parent immediately
    try { if (typeof onNotInterested === 'function') onNotInterested(top); } catch(_){}
    // Remove the card on next frame so exit animation can read latest state
    requestAnimationFrame(() => {
      removeTop();
      // Scroll to top for next position
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // Reset exit direction after animation window
    setTimeout(() => setExitDirection(null), 500);
  }

  // Keyboard shortcuts for quick actions, ignore while typing or animating
  useEffect(() => {
    function onKey(e){
      if (exitDirection) return;
      const t = e.target;
      const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (isTyping) return;
      if (e.key === 'ArrowRight') handleInterested();
      if (e.key === 'ArrowLeft') handleNotInterested();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitDirection, top]);

  async function markInterested(position){
    try{
      let positionId = position.id ?? position.Id ?? position.positionId ?? position.PositionId;
      positionId = parseInt(positionId,10);
      if (!Number.isFinite(positionId)) throw new Error('invalid positionId');
      const base = API_CONFIG.BASE_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const existingId = position._interest?.id ?? position._interest?.Id ?? null;
      // Optimistic: fire-and-forget network request
      (async () => {
        try{
          if (existingId){
            await fetch(`${base}/api/positioninterests/${existingId}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ interested: true }) });
          } else {
            await fetch(`${base}/api/positioninterests`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ positionId, interested: true }) });
          }
        }catch(_){}
      })();
    }catch(e){ /* non-blocking */ }
  }

  async function markNotInterested(position){
    try{
      let positionId = position.id ?? position.Id ?? position.positionId ?? position.PositionId;
      positionId = parseInt(positionId,10);
      if (!Number.isFinite(positionId)) throw new Error('invalid positionId');
      const base = API_CONFIG.BASE_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const existingId = position._interest?.id ?? position._interest?.Id ?? null;
      // Optimistic: fire-and-forget network request
      (async () => {
        try{
          if (existingId){
            await fetch(`${base}/api/positioninterests/${existingId}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ interested: false }) });
          } else {
            await fetch(`${base}/api/positioninterests`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ positionId, interested: false }) });
          }
        }catch(_){}
      })();
    }catch(e){ }
  }

  if (loading) return <div className="text-center">Loading positions…</div>
  if (!top) return <div className="alert alert-secondary">No more positions</div>

  // Extract position data with correct API structure
  const title = top.title ?? top.Title ?? top.jobTitle ?? 'Position';
  const companyName = top.employer?.companyName ?? top.employer?.CompanyName ?? 'Company not specified';
  const companyDescription = top.employer?.companyDescription ?? top.employer?.CompanyDescription ?? 'A great company to work for.';
  const companyWebsite = top.employer?.companyWebsite ?? top.employer?.CompanyWebsite ?? 'https://example.com';
  const companySize = top.employer?.companySize ?? top.employer?.CompanySize ?? null;
  const city = top.employer?.city ?? top.employer?.City ?? 'City';
  const state = top.employer?.state ?? top.employer?.State ?? 'State';

  // Extract requirements data from nested objects
  // Normalize requirements arrays from multiple possible shapes/keys
  const rawEducations = Array.isArray(top.educations)
    ? top.educations
    : Array.isArray(top.educationLevels)
      ? top.educationLevels
      : Array.isArray(top.education)
        ? top.education
        : [];

  const rawExperiences = Array.isArray(top.experiences)
    ? top.experiences
    : Array.isArray(top.experience)
      ? top.experience
      : [];

  const rawSkills = Array.isArray(top.skillsList)
    ? top.skillsList
    : Array.isArray(top.skills)
      ? top.skills
      : [];

  const educationArr = rawEducations
    .map(edu => (edu?.education ?? edu?.Education ?? edu))
    .filter(Boolean);

  const experiencesArr = rawExperiences
    .map(exp => (exp?.experience ?? exp?.Experience ?? exp))
    .filter(Boolean);

  const skillsArr = rawSkills
    .map(skill => (skill?.skill ?? skill?.Skill ?? skill))
    .filter(Boolean);

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
    const type = top.salaryType ?? top.SalaryType ?? 'None';
    const val = top.salaryValue ?? top.SalaryValue;
    const minVal = top.salaryMin ?? top.SalaryMin;
    const maxVal = top.salaryMax ?? top.SalaryMax;

    // Fixed salary
    if (val && type && type !== 'None') {
      const v = new Intl.NumberFormat('en-US').format(Number(val));
      return `$${v} ${type.toLowerCase()}`;
    }
    // Range
    if (minVal && type && type !== 'None') {
      const min = new Intl.NumberFormat('en-US').format(Number(minVal));
      const max = maxVal ? ` - $${new Intl.NumberFormat('en-US').format(Number(maxVal))}` : '';
      return `$${min}${max} ${type.toLowerCase()}`;
    }
    return 'Salary not specified';
  };

  const shouldShowMore = (text) => {
    return text && text.length > 500;
  };

  const description = top.description ?? top.Description ?? 'No description provided.';

  // Unique key for the current top card to drive enter/exit animations
  const topKey = (top?.id ?? top?.Id ?? top?.positionId ?? top?.PositionId ?? `idx-${stack.length}`) + '';

  async function copyShareLinkForTopPosition() {
    if (!top || shareBusy) return;
    try {
      let positionId = top.id ?? top.Id ?? top.positionId ?? top.PositionId;
      positionId = parseInt(positionId, 10);
      if (!Number.isFinite(positionId)) throw new Error('invalid positionId');
  const base = API_CONFIG.BASE_URL;
  const auth = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  if (!auth) { setToastMsg('Sign in to share jobs'); return; }
      setShareBusy(true);
      const res = await fetch(`${base}/api/positions/share-link/${encodeURIComponent(positionId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth}` }
      });
      if (!res.ok) {
        const txt = await res.text();
        const err = new Error(txt || 'Failed to create share link');
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      const link = data?.url;
      if (!link) throw new Error('Missing link');
      try {
        await navigator.clipboard.writeText(link);
        setToastMsg('Share link copied');
      } catch {
        window.prompt('Copy this link:', link);
      }
    } catch (err) {
      let msg = err?.message || 'Unable to create share link';
      const lower = (msg || '').toLowerCase();
      if (err?.status === 403) {
        msg = 'Sharing not permitted for this job';
      } else if (lower.includes('unauthorized') || lower.includes('forbid')) {
        msg = 'Sign in to share jobs';
      }
      setToastMsg(msg);
    } finally {
      setShareBusy(false);
      if (typeof window !== 'undefined') setTimeout(() => setToastMsg(''), 2500);
    }
  }

  return (
    <div className="position-swiper">
      {/* Action bar will now render below the card (sticky within content) */}

      <AnimatePresence mode="wait" initial={false}>
      {top && (
        <motion.div
          key={topKey}
          className="card border-0 shadow-lg"
          style={{ borderRadius: '20px', overflow: 'hidden', maxWidth: '800px', margin: '0 auto' }}
          variants={swipeVariants}
          initial="enter"
          animate="center"
          exit={exitDirection === 'right' ? 'exitRight' : exitDirection === 'left' ? 'exitLeft' : undefined}
        >
        {/* Share button moved into the card header (solid) */}
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
            {/* Right: Solid Share button inside header */}
            <div className="col-auto mt-3 mt-md-0">
              <button
                className="btn btn-light d-flex align-items-center gap-2"
                style={{
                  fontWeight: 600,
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.18)'
                }}
                onClick={copyShareLinkForTopPosition}
                disabled={shareBusy}
                title="Copy public share link"
                aria-label="Share job"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                <span className="d-none d-sm-inline">{shareBusy ? 'Copying…' : 'Share Job'}</span>
              </button>
            </div>
          </div>
        </div>

  {/* Main Content */}
  <div className="modal-body p-0">
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
                    __html: sanitizeDescription(description.replace(/\n/g, '<br>'))
                  }} />
                ) : (
                  <div dangerouslySetInnerHTML={{
                    __html: sanitizeDescription(description.substring(0, 500) + '...')
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
              <div className="mb-4">
                <h6 className="fw-bold mb-3 text-dark">
                  <i className="fas fa-graduation-cap me-2 text-success"></i>
                  Education Requirements
                </h6>
                {educationArr.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {educationArr.map((edu, index) => (
                      <span key={index} className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2">
                        {typeof edu === 'string' ? edu : (edu?.name ?? edu?.title ?? JSON.stringify(edu))}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">Not specified</p>
                )}
              </div>

              {/* Experience Requirements */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3 text-dark">
                  <i className="fas fa-briefcase me-2 text-info"></i>
                  Experience Requirements
                </h6>
                {experiencesArr.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {experiencesArr.map((exp, index) => (
                      <span key={index} className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2">
                        {typeof exp === 'string' ? exp : (exp?.name ?? exp?.title ?? JSON.stringify(exp))}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">Not specified</p>
                )}
              </div>

              {/* Skills */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3 text-dark">
                  <i className="fas fa-star me-2 text-warning"></i>
                  Skills
                </h6>
                {skillsArr.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {skillsArr.map((skill, index) => (
                      <span key={index} className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2">
                        {typeof skill === 'string' ? skill : (skill?.name ?? skill?.title ?? JSON.stringify(skill))}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">Not specified</p>
                )}
              </div>

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
          {posterVideo && (
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
                  <source src={posterVideo} type="video/mp4" />
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
                  <p className="text-muted mb-0">{top.travelRequirements ?? top.TravelRequirements ?? 'None'}</p>
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

        {/* Footer removed: actions moved to sticky bar below */}
        </motion.div>
      )}
      </AnimatePresence>
  {/* Sticky in-flow action bar: below card, above footer */}
  {top && (
    <div className="bg-white border rounded-3 shadow-sm mx-auto mt-3" style={{ maxWidth: '800px', position: 'sticky', bottom: '16px', zIndex: 100 }}>
      <div className="px-3 py-2">
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-danger flex-fill"
            onClick={handleNotInterested}
            disabled={!!exitDirection}
            style={{ minHeight: '44px' }}
          >
            Not Interested
          </button>
          <button 
            className="btn btn-primary flex-fill"
            onClick={handleInterested}
            disabled={!!exitDirection}
            style={{ minHeight: '44px' }}
          >
            I'm Interested
          </button>
        </div>
      </div>
    </div>
  )}
      <div className="text-muted small mt-2">{stack.length} position(s) left</div>

      {!!toastMsg && (
        <div style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          background: '#111827',
          color: '#fff',
          padding: '10px 14px',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          fontSize: 14,
          zIndex: 2000
        }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
