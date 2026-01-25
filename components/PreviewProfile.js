import React, { useState, useEffect } from 'react';
import { useSignedBlobUrl } from '../utils/blobHelpers';
import VideoPlayer from './VideoPlayer';

const PreviewProfile = ({ seeker, show, onHide }) => {
  // Normalize legacy values missing container
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

  // Sign blob URLs
  const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  const { signedUrl: headshotUrl } = useSignedBlobUrl(ensureContainer(seeker?.headshotUrl, 'headshot'), token);
  const { signedUrl: videoUrl } = useSignedBlobUrl(ensureContainer(seeker?.videoUrl, 'video'), token);
  const { signedUrl: resumeUrl } = useSignedBlobUrl(ensureContainer(seeker?.resumeUrl, 'resume'), token);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  // Handle both parsed arrays and JSON strings for experience/education
  let experience = [];
  let education = [];

  // Try to get experience - could be already parsed array or JSON string
  if (Array.isArray(seeker.Experience)) {
    experience = seeker.Experience;
  } else if (Array.isArray(seeker.experience)) {
    experience = seeker.experience;
  } else {
    // Fall back to parsing JSON strings
    try {
      const experienceJson = seeker.experienceJson || seeker.ExperienceJson;
      if (experienceJson && experienceJson.trim()) {
        experience = JSON.parse(experienceJson);
        if (!Array.isArray(experience)) {
          console.warn('Experience data is not an array:', experience);
          experience = [];
        }
      }
    } catch (error) {
      console.error('Error parsing experience JSON:', error);
      experience = [];
    }
  }

  // Try to get education - could be already parsed array or JSON string
  if (Array.isArray(seeker.Education)) {
    education = seeker.Education;
  } else if (Array.isArray(seeker.education)) {
    education = seeker.education;
  } else {
    // Fall back to parsing JSON strings
    try {
      const educationJson = seeker.educationJson || seeker.EducationJson;
      if (educationJson && educationJson.trim()) {
        education = JSON.parse(educationJson);
        if (!Array.isArray(education)) {
          console.warn('Education data is not an array:', education);
          education = [];
        }
      }
    } catch (error) {
      console.error('Error parsing education JSON:', error);
      education = [];
    }
  }

  // Parse comma-separated arrays
  const skills = seeker.skills ? seeker.skills.split(',').map(s => s.trim()).filter(s => s) : [];
  const languages = seeker.languages ? seeker.languages.split(',').map(l => l.trim()).filter(l => l) : [];
  const certifications = seeker.certifications ? seeker.certifications.split(',').map(c => c.trim()).filter(c => c) : [];
  const interests = seeker.interests ? seeker.interests.split(',').map(i => i.trim()).filter(i => i) : [];
  const workSettings = seeker.workSetting ? seeker.workSetting.split(',').map(w => w.trim()).filter(w => w) : [];

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '';
    const start = startDate ? new Date(startDate).getFullYear() : '';
    const end = endDate ? new Date(endDate).getFullYear() : 'Present';
    return start && end ? `${start} - ${end}` : start || end;
  };

  return (
    <>
      {/* Full-page overlay backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1040,
          overflowY: 'auto'
        }}
        onClick={(e) => {
          // Only close if clicking the backdrop itself, not the card
          if (e.target === e.currentTarget) {
            onHide();
          }
        }}
      >
        {/* Close button - fixed in top right */}
        <button
          type="button"
          className="btn-close"
          onClick={onHide}
          aria-label="Close"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1060,
            background: 'white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            padding: '0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        ></button>

        {/* Scrollable content container */}
        <div 
          style={{ padding: '40px 20px', minHeight: '100%' }}
          onClick={(e) => {
            // Close if clicking the padding area, not the card
            if (e.target === e.currentTarget) {
              onHide();
            }
          }}
        >
          <div className="profile-preview-card" style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            maxWidth: '800px',
            margin: '0 auto'
          }}>

                {/* Top Section - Header */}
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
                        {headshotUrl ? (
                          <img
                            src={headshotUrl}
                            alt={`${seeker.firstName} ${seeker.lastName}`}
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
                            {(seeker.firstName || '')[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-9">
                      <h2 style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                        {seeker.firstName} {seeker.lastName}
                      </h2>
                      <p style={{ marginBottom: '12px', opacity: 0.9 }}>
                        {seeker.city && seeker.state ? `${seeker.city}, ${seeker.state}` : 'Location not specified'}
                      </p>
                      {seeker.professionalSummary && (
                        <p style={{ fontSize: '16px', lineHeight: '1.5', opacity: 0.95 }}>
                          {seeker.professionalSummary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content */}
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
                              {(exp.description || exp.Description) && (
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
                              <h6 style={{ marginBottom: '4px', color: '#333' }}>{edu.school || edu.School || 'School not specified'}</h6>
                              <p style={{ marginBottom: '4px', color: '#666', fontSize: '12px' }}>
                                {(edu.level || edu.Level || '') + ((edu.degree || edu.Degree) ? ` • ${edu.degree || edu.Degree}` : '')}
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
                  {videoUrl && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ color: '#333', marginBottom: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Video Introduction
                      </h4>
                      <VideoPlayer videoUrl={videoUrl} title="Video Introduction" />
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
                            {seeker.travel || 'Not specified'}
                          </p>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <strong style={{ color: '#333' }}>Relocate:</strong>
                          <p style={{ marginTop: '4px', color: '#666' }}>
                            {seeker.relocate || 'Not specified'}
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

                        {seeker.preferredSalary && (
                          <div style={{ marginBottom: '16px' }}>
                            <strong style={{ color: '#333' }}>Preferred Salary:</strong>
                            <p style={{ marginTop: '4px', color: '#666' }}>
                              {seeker.preferredSalary}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default PreviewProfile;