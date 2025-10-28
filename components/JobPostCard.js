import React, { useState, useEffect } from 'react';
import { useSignedBlobUrl } from '../utils/blobHelpers';

const JobPostCard = ({ position, show, onHide }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Sign blob URLs
  const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  const { signedUrl: posterVideo } = useSignedBlobUrl(position?.posterVideoUrl, token);

  console.log('JobPostCard render:', { position, show, onHide });
  console.log('🔍 Company size in position:', position.companySize);
  console.log('🔍 Company size type:', typeof position.companySize);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && show) {
        onHide();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [show, onHide]);

  if (!show) return null;

  // Mock company data - in real app this would come from API
  // Format company size from enum value
  const formatCompanySize = (size) => {
    console.log('🔧 formatCompanySize called with:', size, 'type:', typeof size);
    if (size === null || size === undefined) {
      console.log('🔧 Returning "Company size not specified" because size is null/undefined');
      return 'Company size not specified';
    }
    if (!size && size !== 0) {
      console.log('🔧 Returning "Company size not specified" because size is falsy and not 0');
      return 'Company size not specified';
    }
    const parsedSize = parseInt(size);
    console.log('🔧 Parsed size:', parsedSize);
    switch (parsedSize) {
      case 0: 
        console.log('🔧 Returning "<500 employees"');
        return '<500 employees';
      case 1: 
        console.log('🔧 Returning "500-1000 employees"');
        return '500-1000 employees';
      case 2: 
        console.log('🔧 Returning "1000+ employees"');
        return '1000+ employees';
      default: 
        console.log('🔧 Returning "Company size not specified" for default case');
        return 'Company size not specified';
    }
  };

  const companyData = {
    name: position.companyName || 'Company Name',
    logo: position.companyLogo || null,
    description: position.companyDescription || 'A great company to work for.',
    website: position.companyWebsite || 'https://example.com',
    size: formatCompanySize(position.companySize),
    city: position.city || 'City',
    state: position.state || 'State'
  };

  console.log('📊 Final companyData:', companyData);

  const formatSalary = () => {
    if (position.salaryType === 'None' || !position.salaryMin) return 'Salary not specified';
    const min = new Intl.NumberFormat('en-US').format(position.salaryMin);
    const max = position.salaryMax ? ` - $${new Intl.NumberFormat('en-US').format(position.salaryMax)}` : '';
    const period = position.salaryType.toLowerCase();
    return `$${min}${max} ${period}`;
  };

  const shouldShowMore = (text) => {
    return text && text.length > 500;
  };

  return (
    <>
      {/* Bootstrap Modal - Full screen scrollable */}
      {show && (
        <div 
          className="modal fade show d-block" 
          tabIndex="-1" 
          role="dialog"
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target.classList.contains('modal')) {
              onHide();
            }
          }}
        >
          <div className="modal-dialog modal-lg my-5" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              {/* Close Button */}
              <button
                type="button"
                className="btn-close position-absolute top-0 end-0 m-3 z-index-1"
                onClick={onHide}
                aria-label="Close"
                style={{ zIndex: 10 }}
              ></button>

              {/* Top Section - Bumble Style */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="row align-items-center">
                  {/* Left: Company Logo */}
                  <div className="col-auto">
                    {companyData.logo ? (
                      <img
                        src={companyData.logo}
                        alt={`${companyData.name} logo`}
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
                        {companyData.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Right: Job Info */}
                  <div className="col">
                    <h3 className="fw-bold mb-1 fs-4">{position.title || 'Job Title'}</h3>
                    <h5 className="fw-semibold mb-1 text-light">{companyData.name}</h5>
                    <p className="mb-0 text-white-50 small">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      {companyData.city}, {companyData.state}
                    </p>
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
                      {showFullDescription || !shouldShowMore(position.description || '') ? (
                        <div dangerouslySetInnerHTML={{
                          __html: (position.description || 'No description available.').replace(/\n/g, '<br>')
                        }} />
                      ) : (
                        <div dangerouslySetInnerHTML={{
                          __html: (position.description || 'No description available.').substring(0, 500) + '...'
                        }} />
                      )}

                      {shouldShowMore(position.description || '') && (
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
                    {(position.education || []).length > 0 && (
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3 text-dark">
                          <i className="fas fa-graduation-cap me-2 text-success"></i>
                          Education Requirements
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          {position.education.map((edu, index) => (
                            <span key={index} className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2">
                              {edu}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience Requirements */}
                    {(position.experiences || []).length > 0 && (
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3 text-dark">
                          <i className="fas fa-briefcase me-2 text-info"></i>
                          Experience Requirements
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          {position.experiences.map((exp, index) => (
                            <span key={index} className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2">
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {(position.skills || []).length > 0 && (
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3 text-dark">
                          <i className="fas fa-star me-2 text-warning"></i>
                          Skills
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          {position.skills.map((skill, index) => (
                            <span key={index} className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2">
                              {skill}
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
                        <p className="text-muted mb-0">{position.workSetting || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <i className="fas fa-plane fa-2x text-info mb-2"></i>
                        <h6 className="fw-bold text-dark mb-1">Travel Requirements</h6>
                        <p className="text-muted mb-0">{position.travel || 'None'}</p>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <i className="fas fa-users fa-2x text-success mb-2"></i>
                        <h6 className="fw-bold text-dark mb-1">Company Size</h6>
                        <p className="text-muted mb-0">{companyData.size}</p>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <i className="fas fa-briefcase fa-2x text-warning mb-2"></i>
                        <h6 className="fw-bold text-dark mb-1">Employment Type</h6>
                        <p className="text-muted mb-0">{position.employmentType || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="modal-footer bg-white border-top p-3">
                <div className="d-flex gap-2 w-100 justify-content-center">
                  <button className="btn btn-outline-secondary px-4">
                    <i className="fas fa-share me-2"></i>Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {show && <div className="modal-backdrop fade show"></div>}
    </>
  );
};

export default JobPostCard;