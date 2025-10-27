import React from 'react';
import { useSignedBlobUrl } from '../utils/blobHelpers';

const SeekerProfilePreview = ({ seeker, onInterested, onNotInterested }) => {
  // Normalize legacy values missing container
  const ensureContainer = (val, kind) => {
    if (!val || typeof val !== 'string') return val;
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    if (val.includes('/')) return val;
    const lower = val.toLowerCase();
    if (kind === 'headshot') return `qaseekerheadshot/${val}`;
    if (kind === 'video') return `qaseekervideo/${val}`;
    if (kind === 'resume') return `qaresumes/${val}`;
    if (/(\.jpg|\.jpeg|\.png|\.gif)$/i.test(lower)) return `qaseekerheadshot/${val}`;
    if (/(\.mp4|\.mov|\.webm)$/i.test(lower)) return `qaseekervideo/${val}`;
    if (/(\.pdf|\.doc|\.docx)$/i.test(lower)) return `qaresumes/${val}`;
    return val;
  };

  // Sign blob URLs (hooks must be called unconditionally)
  const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  const { signedUrl: headshotUrl } = useSignedBlobUrl(ensureContainer(seeker?.headshotUrl, 'headshot'), token);
  const { signedUrl: videoUrl } = useSignedBlobUrl(ensureContainer(seeker?.videoUrl, 'video'), token);
  const { signedUrl: resumeUrl } = useSignedBlobUrl(ensureContainer(seeker?.resumeUrl, 'resume'), token);

  if (!seeker) return null;

  // Parse data similar to PreviewProfile
  const experience = seeker.experienceJson ? JSON.parse(seeker.experienceJson) : [];
  const education = seeker.educationJson ? JSON.parse(seeker.educationJson) : [];
  const skills = seeker.skills ? seeker.skills.split(',').map(s => s.trim()) : [];
  const languages = seeker.languages ? seeker.languages.split(',').map(l => l.trim()) : [];
  const certifications = seeker.certifications ? seeker.certifications.split(',').map(c => c.trim()) : [];

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '';
    const start = startDate ? new Date(startDate).getFullYear() : '';
    const end = endDate ? new Date(endDate).getFullYear() : 'Present';
    return start && end ? `${start} - ${end}` : start || end;
  };

  return (
    <div className="seeker-profile-preview" style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      maxWidth: '600px',
      margin: '0 auto'
    }}>

      {/* Header Section */}
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div className="row align-items-center">
          <div className="col-4 text-center">
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: headshotUrl ? `url(${headshotUrl})` : '#ccc',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              margin: '0 auto',
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              {!headshotUrl && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 'bold'
                }}>
                  {(seeker.firstName || '')[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
          <div className="col-8">
            <h3 style={{ marginBottom: '4px', fontWeight: 'bold' }}>
              {seeker.firstName} {seeker.lastName}
            </h3>
            <p style={{ marginBottom: '8px', opacity: 0.9 }}>
              {seeker.city && seeker.state ? `${seeker.city}, ${seeker.state}` : 'Location not specified'}
            </p>
            {seeker.professionalSummary && (
              <p style={{ fontSize: '14px', lineHeight: '1.4', opacity: 0.95 }}>
                {seeker.professionalSummary.length > 100
                  ? `${seeker.professionalSummary.substring(0, 100)}...`
                  : seeker.professionalSummary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '20px' }}>

        {/* Video Section */}
        {videoUrl && (
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: '#333', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '4px' }}>
              Video Introduction
            </h5>
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
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* Skills Section */}
        {skills.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: '#333', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '4px' }}>
              Skills
            </h5>
            <div>
              {skills.slice(0, 8).map((skill, index) => (
                <span key={index} style={{
                  display: 'inline-block',
                  background: '#667eea',
                  color: 'white',
                  padding: '4px 10px',
                  margin: '2px 6px 2px 0',
                  borderRadius: '15px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {skill}
                </span>
              ))}
              {skills.length > 8 && (
                <span style={{
                  display: 'inline-block',
                  background: '#f8f9fa',
                  color: '#666',
                  padding: '4px 10px',
                  margin: '2px 6px 2px 0',
                  borderRadius: '15px',
                  fontSize: '12px'
                }}>
                  +{skills.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Experience Preview */}
        {experience.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: '#333', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '4px' }}>
              Recent Experience
            </h5>
            <div>
              {experience.slice(0, 2).map((exp, index) => (
                <div key={index} style={{
                  marginBottom: '12px',
                  padding: '10px',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  borderLeft: '3px solid #667eea'
                }}>
                  <h6 style={{ marginBottom: '2px', color: '#333', fontSize: '14px' }}>{exp.title}</h6>
                  <p style={{ marginBottom: '2px', color: '#666', fontSize: '12px' }}>
                    {exp.company || 'Company not specified'}
                  </p>
                  <p style={{ marginBottom: '0', color: '#888', fontSize: '11px' }}>
                    {formatDateRange(exp.startDate, exp.endDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resume Link */}
        {resumeUrl && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-primary btn-sm"
            >
              <i className="fas fa-file-alt me-2"></i>View Resume
            </a>
          </div>
        )}

      </div>

      {/* Action Buttons */}
      <div className="card-footer d-flex justify-content-between" style={{
        padding: '16px 20px',
        background: '#f8f9fa',
        borderTop: '1px solid #dee2e6'
      }}>
        <button
          className="btn btn-outline-danger"
          onClick={onNotInterested}
          style={{ minWidth: '120px' }}
        >
          <i className="fas fa-times me-2"></i>Not Interested
        </button>
        <button
          className="btn btn-success"
          onClick={onInterested}
          style={{ minWidth: '120px' }}
        >
          <i className="fas fa-heart me-2"></i>Interested
        </button>
      </div>
    </div>
  );
};

export default SeekerProfilePreview;