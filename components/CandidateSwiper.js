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
        // Filter out seekers with inactive profiles
        const activeSeekers = Array.isArray(list) ? list.filter(seeker => seeker.isProfileActive !== false) : [];
        setStack(activeSeekers);
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

  // Parse JSON data (same as PreviewProfile) with better error handling
  let experience = [];
  let education = [];

  try {
    // Try both lowercase and uppercase field names
    const experienceJson = top.experienceJson || top.ExperienceJson;
    if (experienceJson && experienceJson.trim()) {
      experience = JSON.parse(experienceJson);
      if (!Array.isArray(experience)) {
        console.warn('Experience data is not an array:', experience);
        experience = [];
      }
    }
  } catch (error) {
    console.error('Error parsing experience JSON:', error, 'Raw data:', top.experienceJson || top.ExperienceJson);
    experience = [];
  }

  try {
    // Try both lowercase and uppercase field names
    const educationJson = top.educationJson || top.EducationJson;
    if (educationJson && educationJson.trim()) {
      education = JSON.parse(educationJson);
      if (!Array.isArray(education)) {
        console.warn('Education data is not an array:', education);
        education = [];
      }
    }
  } catch (error) {
    console.error('Error parsing education JSON:', error, 'Raw data:', top.educationJson || top.EducationJson);
    education = [];
  }

  // Parse comma-separated arrays
  const skills = top.skills ? top.skills.split(',').map(s => s.trim()) : [];
  const languages = top.languages ? top.languages.split(',').map(l => l.trim()) : [];
  const certifications = top.certifications ? top.certifications.split(',').map(c => c.trim()) : [];
  const interests = top.interests ? top.interests.split(',').map(i => i.trim()) : [];
  const workSettings = top.workSetting ? top.workSetting.split(',').map(w => w.trim()) : [];

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '';
    const start = startDate ? new Date(startDate).getFullYear() : '';
    const end = endDate ? new Date(endDate).getFullYear() : 'Present';
    return start && end ? `${start} - ${end}` : start || end;
  };

  return (
    <div className="candidate-swiper">
      <div className="profile-preview-card" style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        maxWidth: '800px',
        margin: '0 auto'
      }}>

        {/* Top Section - Header (Exact copy from PreviewProfile) */}
        <div className="profile-header" style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div className="row align-items-center">
            <div className="col-md-3 text-center">
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                margin: '0 auto',
                border: '4px solid white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {top.headshotUrl ? (
                  <img
                    src={top.headshotUrl}
                    alt={`${top.firstName} ${top.lastName}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: '#ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    fontWeight: 'bold'
                  }}>
                    {(top.firstName || '')[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-9">
              <h2 style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                {top.firstName} {top.lastName}
              </h2>
              <p style={{ marginBottom: '12px', opacity: 0.9 }}>
                {top.city && top.state ? `${top.city}, ${top.state}` : 'Location not specified'}
              </p>
              {top.professionalSummary && (
                <p style={{ fontSize: '16px', lineHeight: '1.5', opacity: 0.95 }}>
                  {top.professionalSummary}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content (Exact copy from PreviewProfile) */}
        <div style={{ padding: '24px' }}>

          {/* Experience & Education Section */}
          <div className="row" style={{ marginBottom: '32px' }}>
            <div className="col-md-6">
              <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                Experience
              </h4>
              {experience.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {experience.map((exp, index) => (
                    <div key={index} style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: '4px solid #667eea'
                    }}>
                      <h6 style={{ marginBottom: '4px', color: '#333' }}>{exp.title || exp.Title || 'Title not specified'}</h6>
                      <p style={{ marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                        {exp.company || exp.Company || 'Company not specified'}
                      </p>
                      <p style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>
                        {formatDateRange(exp.startDate || exp.StartDate, exp.endDate || exp.EndDate)}
                      </p>
                      {exp.description || exp.Description && (
                        <p style={{ fontSize: '14px', color: '#555' }}>{exp.description || exp.Description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#888', fontStyle: 'italic' }}>No experience added yet</p>
              )}
            </div>

            <div className="col-md-6">
              <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                Education
              </h4>
              {education.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {education.map((edu, index) => (
                    <div key={index} style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: '4px solid #28a745'
                    }}>
                      <h6 style={{ marginBottom: '4px', color: '#333' }}>{edu.degree || edu.Level || 'Degree not specified'}</h6>
                      <p style={{ marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                        {edu.school || edu.School || 'School not specified'}
                      </p>
                      <p style={{ color: '#888', fontSize: '12px' }}>
                        {formatDateRange(edu.startDate || edu.StartDate, edu.endDate || edu.EndDate)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#888', fontStyle: 'italic' }}>No education added yet</p>
              )}

              {/* Certifications */}
              {certifications.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h5 style={{ color: '#333', marginBottom: '12px' }}>Certifications</h5>
                  <div>
                    {certifications.map((cert, index) => (
                      <span key={index} style={{
                        display: 'inline-block',
                        background: '#e9ecef',
                        color: '#495057',
                        padding: '4px 8px',
                        margin: '2px 4px 2px 0',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skills Section */}
          {skills.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                Skills
              </h4>
              <div>
                {skills.map((skill, index) => (
                  <span key={index} style={{
                    display: 'inline-block',
                    background: '#667eea',
                    color: 'white',
                    padding: '6px 12px',
                    margin: '4px 8px 4px 0',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Video Section */}
          {top.videoUrl && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                Video Introduction
              </h4>
              <div style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <video
                  controls
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '8px'
                  }}
                >
                  <source src={top.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
              Preferences & Additional Info
            </h4>
            <div className="row">
              <div className="col-md-6">
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#333' }}>Work Setting:</strong>
                  <p style={{ marginTop: '4px', color: '#666' }}>
                    {workSettings.length > 0 ? workSettings.join(', ') : 'Not specified'}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#333' }}>Travel:</strong>
                  <p style={{ marginTop: '4px', color: '#666' }}>
                    {top.travel || 'Not specified'}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#333' }}>Relocate:</strong>
                  <p style={{ marginTop: '4px', color: '#666' }}>
                    {top.relocate || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="col-md-6">
                {languages.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#333' }}>Languages:</strong>
                    <p style={{ marginTop: '4px', color: '#666' }}>
                      {languages.join(', ')}
                    </p>
                  </div>
                )}

                {interests.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#333' }}>Interests:</strong>
                    <p style={{ marginTop: '4px', color: '#666' }}>
                      {interests.join(', ')}
                    </p>
                  </div>
                )}

                {top.preferredSalary && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#333' }}>Preferred Salary:</strong>
                    <p style={{ marginTop: '4px', color: '#666' }}>
                      {top.preferredSalary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            borderTop: '1px solid #e9ecef',
            paddingTop: '24px',
            marginTop: '24px'
          }}>
            <div className="row">
              <div className="col-6 text-center">
                <button
                  className="btn btn-outline-danger btn-lg w-100"
                  onClick={() => markNotInterested(top)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  👎 Not Interested
                </button>
              </div>
              <div className="col-6 text-center">
                <button
                  className="btn btn-success btn-lg w-100"
                  onClick={() => markInterested(top)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  👍 Interested
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-3">
        <small className="text-muted">{stack.length} candidate(s) left</small>
      </div>
    </div>
  )
}
