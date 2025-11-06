import React from 'react';
import { useSignedBlobUrl } from '../utils/blobHelpers';

// Renders a single seeker profile card matching the CandidateSwiper card layout (without actions/animations)
export default function PublicSeekerCard({ seeker }) {
  // Normalize path-only values
  const ensureContainer = (val, kind) => {
    if (!val || typeof val !== 'string') return val;
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    if (val.includes('/')) return val;
    const lower = val.toLowerCase();
    if (kind === 'headshot') return `qaseekerheadshot/${val}`;
    if (kind === 'video') return `qaseekervideo/${val}`;
    if (kind === 'resume') return `qaresumes/${val}`;
    if (/\.(jpg|jpeg|png|gif)$/i.test(lower)) return `qaseekerheadshot/${val}`;
    if (/\.(mp4|mov|webm)$/i.test(lower)) return `qaseekervideo/${val}`;
    if (/\.(pdf|doc|docx)$/i.test(lower)) return `qaresumes/${val}`;
    return val;
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  const rawHeadshot = ensureContainer(seeker?.headshotUrl, 'headshot');
  const rawVideo = ensureContainer(seeker?.videoUrl, 'video');
  const { signedUrl: signedHeadshot } = useSignedBlobUrl(rawHeadshot, token);
  const { signedUrl: signedVideo } = useSignedBlobUrl(rawVideo, token);

  // Parse JSON safely
  let experience = [];
  let education = [];
  try {
    const ej = seeker?.experienceJson || seeker?.ExperienceJson;
    if (ej && ej.trim()) {
      const parsed = JSON.parse(ej);
      if (Array.isArray(parsed)) experience = parsed;
    }
  } catch {}
  try {
    const ej = seeker?.educationJson || seeker?.EducationJson;
    if (ej && ej.trim()) {
      const parsed = JSON.parse(ej);
      if (Array.isArray(parsed)) education = parsed;
    }
  } catch {}

  const skills = seeker?.skills ? seeker.skills.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const languages = seeker?.languages ? seeker.languages.split(',').map(l=>l.trim()).filter(Boolean) : [];
  const certifications = seeker?.certifications ? seeker.certifications.split(',').map(c=>c.trim()).filter(Boolean) : [];
  const interests = seeker?.interests ? seeker.interests.split(',').map(i=>i.trim()).filter(Boolean) : [];
  const workSettings = seeker?.workSetting ? seeker.workSetting.split(',').map(w=>w.trim()).filter(Boolean) : [];

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '';
    const start = startDate ? new Date(startDate).getFullYear() : '';
    const end = endDate ? new Date(endDate).getFullYear() : 'Present';
    return start && end ? `${start} - ${end}` : start || end;
  };

  return (
    <div className="profile-preview-card" 
         style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden', maxWidth: '800px', margin: '0 auto' }}>

      {/* Header - match swiper */}
      <div className="profile-header" style={{ padding: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <div className="row align-items-center">
          <div className="col-md-3 text-center">
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', overflow: 'hidden', position: 'relative' }}>
              {signedHeadshot ? (
                <img src={signedHeadshot} alt={`${seeker.firstName} ${seeker.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold' }}>
                  {(seeker.firstName || '')[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
          <div className="col-md-9">
            <h2 style={{ marginBottom: '8px', fontWeight: 'bold' }}>{seeker.firstName} {seeker.lastName}</h2>
            <p style={{ marginBottom: '12px', opacity: 0.9 }}>
              {seeker.city && seeker.state ? `${seeker.city}, ${seeker.state}` : 'Location not specified'}
            </p>
            {seeker.professionalSummary && (
              <p style={{ fontSize: '16px', lineHeight: '1.5', opacity: 0.95 }}>{seeker.professionalSummary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - match swiper */}
      <div style={{ padding: '24px' }}>
        <div className="row" style={{ marginBottom: '32px' }}>
          <div className="col-md-6">
            <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>Experience</h4>
            {experience.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {experience.map((exp, idx) => (
                  <div key={idx} style={{ marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
                    <h6 style={{ marginBottom: '4px', color: '#333' }}>{exp.title || exp.Title || 'Title not specified'}</h6>
                    <p style={{ marginBottom: '4px', color: '#666', fontSize: '14px' }}>{exp.company || exp.Company || 'Company not specified'}</p>
                    <p style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>{formatDateRange(exp.startDate || exp.StartDate, exp.endDate || exp.EndDate)}</p>
                    {(exp.description || exp.Description) && <p style={{ fontSize: '14px', color: '#555' }}>{exp.description || exp.Description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#888', fontStyle: 'italic' }}>No experience added yet</p>
            )}
          </div>

          <div className="col-md-6">
            <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>Education</h4>
            {education.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {education.map((edu, idx) => (
                  <div key={idx} style={{ marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
                    <h6 style={{ marginBottom: '4px', color: '#333' }}>{edu.school || edu.School || 'School not specified'}</h6>
                    <p style={{ marginBottom: '4px', color: '#666', fontSize: '12px' }}>{(edu.Level || edu.level || '') + ((edu.Degree || edu.degree) ? ` • ${edu.Degree || edu.degree}` : '')}</p>
                    <p style={{ color: '#888', fontSize: '12px' }}>{formatDateRange(edu.startDate || edu.StartDate, edu.endDate || edu.EndDate)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#888', fontStyle: 'italic' }}>No education added yet</p>
            )}

            {certifications.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h5 style={{ color: '#333', marginBottom: '12px' }}>Certifications</h5>
                <div>
                  {certifications.map((cert, idx) => (
                    <span key={idx} style={{ display: 'inline-block', background: '#e9ecef', color: '#495057', padding: '4px 8px', margin: '2px 4px 2px 0', borderRadius: '4px', fontSize: '12px' }}>{cert}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {skills.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>Skills</h4>
            <div>
              {skills.map((skill, idx) => (
                <span key={idx} style={{ display: 'inline-block', background: '#667eea', color: 'white', padding: '6px 12px', margin: '4px 8px 4px 0', borderRadius: '20px', fontSize: '14px', fontWeight: '500' }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {signedVideo && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>Video Introduction</h4>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <video controls style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '8px' }}>
                <source src={signedVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>Preferences & Additional Info</h4>
          <div className="row">
            <div className="col-md-6">
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#333' }}>Work Setting:</strong>
                <p style={{ marginTop: '4px', color: '#666' }}>{workSettings.length > 0 ? workSettings.join(', ') : 'Not specified'}</p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#333' }}>Travel:</strong>
                <p style={{ marginTop: '4px', color: '#666' }}>{seeker.travel || 'Not specified'}</p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#333' }}>Relocate:</strong>
                <p style={{ marginTop: '4px', color: '#666' }}>{seeker.relocate || 'Not specified'}</p>
              </div>
            </div>
            <div className="col-md-6">
              {languages.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#333' }}>Languages:</strong>
                  <p style={{ marginTop: '4px', color: '#666' }}>{languages.join(', ')}</p>
                </div>
              )}
              {interests.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#333' }}>Interests:</strong>
                  <p style={{ marginTop: '4px', color: '#666' }}>{interests.join(', ')}</p>
                </div>
              )}
              {seeker.preferredSalary && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#333' }}>Preferred Salary:</strong>
                  <p style={{ marginTop: '4px', color: '#666' }}>{seeker.preferredSalary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
