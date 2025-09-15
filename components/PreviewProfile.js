import React, { useState, useEffect } from 'react';

const PreviewProfile = ({ seeker, show, onHide }) => {
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

  // Parse JSON data
  const experience = seeker.experienceJson ? JSON.parse(seeker.experienceJson) : [];
  const education = seeker.educationJson ? JSON.parse(seeker.educationJson) : [];

  // Parse comma-separated arrays
  const skills = seeker.skills ? seeker.skills.split(',').map(s => s.trim()) : [];
  const languages = seeker.languages ? seeker.languages.split(',').map(l => l.trim()) : [];
  const certifications = seeker.certifications ? seeker.certifications.split(',').map(c => c.trim()) : [];
  const interests = seeker.interests ? seeker.interests.split(',').map(i => i.trim()) : [];
  const workSettings = seeker.workSetting ? seeker.workSetting.split(',').map(w => w.trim()) : [];

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '';
    const start = startDate ? new Date(startDate).getFullYear() : '';
    const end = endDate ? new Date(endDate).getFullYear() : 'Present';
    return start && end ? `${start} - ${end}` : start || end;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onHide}
      ></div>
      
      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        style={{ zIndex: 1050 }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Profile Preview</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onHide}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="profile-preview-card" style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                overflow: 'hidden'
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
                        {seeker.headshotUrl ? (
                          <img
                            src={seeker.headshotUrl}
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
                  {seeker.videoUrl && (
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
                          <source src={seeker.videoUrl} type="video/mp4" />
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
        </div>
      </div>
    </>
  );
};

export default PreviewProfile;