import { useMemo } from 'react';
import { useSignedBlobUrl } from '../utils/blobHelpers';
import { sanitizeDescription } from '../utils/sanitize';

export default function PublicPositionCard({ job }){
  if (!job) return null;

  // Reconstruct the shape PositionSwiper expects
  const employer = useMemo(() => ({
    companyName: job.employerName,
    logoUrl: job.employerLogoUrl,
    city: job.employerCity,
    state: job.employerState,
    companySize: job.employerCompanySize
  }), [job]);

  const companyLogoRaw = employer.logoUrl;
  const posterVideoRaw = job.posterVideoUrl;
  const { signedUrl: companyLogo } = useSignedBlobUrl(companyLogoRaw, null);
  const { signedUrl: posterVideo } = useSignedBlobUrl(posterVideoRaw, null);

  const description = job.description ?? 'No description provided.';

  const educationArr = Array.isArray(job.educationLevels) ? job.educationLevels : [];
  const experiencesArr = Array.isArray(job.experiences) ? job.experiences : [];
  const skillsArr = Array.isArray(job.skills) ? job.skills : [];

  const formatCompanySize = (size) => {
    if (size === null || size === undefined) return 'Company size not specified';
    const parsed = parseInt(size);
    switch (parsed) {
      case 0: return '<500 employees';
      case 1: return '500-1000 employees';
      case 2: return '1000+ employees';
      default: return 'Company size not specified';
    }
  };

  const formatSalary = () => {
    const type = job.salaryType ?? 'None';
    const val = job.salaryValue;
    const minVal = job.salaryMin;
    const maxVal = job.salaryMax;
    if (val && type && type !== 'None') {
      const v = new Intl.NumberFormat('en-US').format(Number(val));
      return `$${v} ${String(type).toLowerCase()}`;
    }
    if (minVal && type && type !== 'None') {
      const min = new Intl.NumberFormat('en-US').format(Number(minVal));
      const max = maxVal ? ` - $${new Intl.NumberFormat('en-US').format(Number(maxVal))}` : '';
      return `$${min}${max} ${String(type).toLowerCase()}`;
    }
    return 'Salary not specified';
  };

  const shouldShowMore = (text) => text && text.length > 500;

  return (
    <div className="card border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
      {/* Header gradient, identical to PositionSwiper */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="row align-items-center">
          <div className="col-auto">
            {companyLogo ? (
              <img src={companyLogo} alt={`${employer.companyName} logo`} className="rounded-circle border border-white border-3" style={{ width: 80, height: 80, objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }} />
            ) : (
              <div className="rounded-circle bg-white bg-opacity-20 d-flex align-items-center justify-content-center fw-bold fs-3 border border-white border-3" style={{ width: 80, height: 80, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
                {(employer.companyName || '?').charAt(0)}
              </div>
            )}
          </div>
          <div className="col">
            <h3 className="fw-bold mb-1 fs-4">{job.title}</h3>
            <h5 className="fw-semibold mb-1 text-light">{employer.companyName}</h5>
            <p className="mb-0 text-white-50 small">{employer.city}, {employer.state}</p>
          </div>
        </div>
      </div>

      {/* Main content (description + requirements) */}
      <div className="modal-body p-0">
        <div className="row g-0">
          <div className="col-md-7 p-4 border-end">
            <h5 className="fw-bold mb-3 text-dark">
              <i className="fas fa-file-alt me-2 text-primary"></i>
              Job Description
            </h5>
            <div className="text-muted">
              <div dangerouslySetInnerHTML={{ __html: sanitizeDescription(description.replace(/\n/g, '<br>')) }} />
            </div>
          </div>
          <div className="col-md-5 p-4 bg-light">
            <div className="mb-4">
              <h6 className="fw-bold mb-3 text-dark">
                <i className="fas fa-graduation-cap me-2 text-success"></i>
                Education Requirements
              </h6>
              {educationArr.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {educationArr.map((edu, i) => (
                    <span key={i} className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2">{edu}</span>
                  ))}
                </div>
              ) : (<p className="text-muted mb-0">Not specified</p>)}
            </div>

            <div className="mb-4">
              <h6 className="fw-bold mb-3 text-dark">
                <i className="fas fa-briefcase me-2 text-info"></i>
                Experience Requirements
              </h6>
              {experiencesArr.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {experiencesArr.map((exp, i) => (
                    <span key={i} className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2">{exp}</span>
                  ))}
                </div>
              ) : (<p className="text-muted mb-0">Not specified</p>)}
            </div>

            <div className="mb-4">
              <h6 className="fw-bold mb-3 text-dark">
                <i className="fas fa-star me-2 text-warning"></i>
                Skills
              </h6>
              {skillsArr.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {skillsArr.map((s, i) => (
                    <span key={i} className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2">{s}</span>
                  ))}
                </div>
              ) : (<p className="text-muted mb-0">Not specified</p>)}
            </div>

            <div className="mb-4">
              <h6 className="fw-bold mb-3 text-dark">
                <i className="fas fa-dollar-sign me-2 text-success"></i>
                Salary
              </h6>
              <p className="h5 text-success fw-bold mb-0">{formatSalary()}</p>
            </div>
          </div>
        </div>

        {posterVideo && (
          <div className="p-4 bg-white">
            <h5 className="fw-bold mb-3 text-dark">
              <i className="fas fa-video me-2 text-danger"></i>
              Company Video
            </h5>
            <div className="ratio ratio-16x9 bg-light rounded-3 overflow-hidden shadow-sm">
              <video controls className="w-100 h-100" style={{ objectFit: 'contain' }}>
                <source src={posterVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        <div className="p-4 bg-light border-top">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="text-center">
                <i className="fas fa-building fa-2x text-primary mb-2"></i>
                <h6 className="fw-bold text-dark mb-1">Work Setting</h6>
                <p className="text-muted mb-0">{job.workSetting ?? 'Not specified'}</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <i className="fas fa-plane fa-2x text-info mb-2"></i>
                <h6 className="fw-bold text-dark mb-1">Travel Requirements</h6>
                <p className="text-muted mb-0">{job.travelRequirements ?? 'None'}</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <i className="fas fa-users fa-2x text-success mb-2"></i>
                <h6 className="fw-bold text-dark mb-1">Company Size</h6>
                <p className="text-muted mb-0">{formatCompanySize(employer.companySize)}</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <i className="fas fa-briefcase fa-2x text-warning mb-2"></i>
                <h6 className="fw-bold text-dark mb-1">Employment Type</h6>
                <p className="text-muted mb-0">{job.employmentType ?? 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
