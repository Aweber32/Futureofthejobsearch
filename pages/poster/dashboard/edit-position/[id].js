import Link from 'next/link';
import Layout from '../../../../components/Layout';
import SkillAutocomplete from '../../../../components/SkillAutocomplete';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import JobPostCard from '../../../../components/JobPostCard';
import { API_CONFIG } from '../../../../config/api';
import { signBlobUrl } from '../../../../utils/blobHelpers';
import { JOB_CATEGORIES, EMPLOYMENT_TYPES, WORK_SETTINGS, EDUCATION_LEVELS } from '../../../../utils/constants';

const API = API_CONFIG.BASE_URL;

export default function EditPosition(){
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [category, setCategory] = useState(JOB_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [posterVideoFile, setPosterVideoFile] = useState(null);
  const [posterVideoUrl, setPosterVideoUrl] = useState('');
  const [signedPosterVideoUrl, setSignedPosterVideoUrl] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [employmentType, setEmploymentType] = useState(EMPLOYMENT_TYPES[0]);
  const [workSetting, setWorkSetting] = useState(WORK_SETTINGS[0]);
  const [travel, setTravel] = useState('');
  const [education, setEducation] = useState([]);
  const [experienceInput, setExperienceInput] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [salaryType, setSalaryType] = useState('None');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Employer data state
  const [employerData, setEmployerData] = useState({
    companyName: '',
    logoUrl: null,
    companyDescription: '',
    website: '',
    companySize: '',
    city: '',
    state: ''
  });

  useEffect(()=>{
    if (!id) return;
    let cancelled = false;
    async function load(){
      setLoading(true);
      try{
        const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
        const res = await fetch(`${API}/api/positions/${id}`);
        if (!res.ok) throw new Error('Position not found');
        const pos = await res.json();
        if (cancelled) return;
        setTitle(pos.title || pos.Title || '');
        setCategory(pos.category || pos.Category || JOB_CATEGORIES[0]);
        setDescription(pos.description || pos.Description || '');
  const rawVideoPath = pos.posterVideoUrl || pos.PosterVideoUrl || '';
  setPosterVideoUrl(rawVideoPath);
        setRemoveVideo(false); // Reset remove video state when loading position
        setEmploymentType(pos.employmentType || pos.EmploymentType || EMPLOYMENT_TYPES[0]);
        setWorkSetting(pos.workSetting || pos.WorkSetting || WORK_SETTINGS[0]);
        setTravel(pos.travelRequirements || pos.TravelRequirements || '');
        setEducation((pos.educations || pos.Educations || []).map(e=> e.education || e.Education));
        setExperiences((pos.experiences || pos.Experiences || []).map(e=> e.experience || e.Experience));
        setSkills((pos.skillsList || pos.SkillsList || []).map(s=> s.skill || s.Skill));
        setSalaryType(pos.salaryType || pos.SalaryType || 'None');
        setSalaryMin(pos.salaryMin ?? pos.SalaryMin ?? '');
        setSalaryMax(pos.salaryMax ?? pos.SalaryMax ?? '');
        setIsOpen(pos.isOpen ?? pos.IsOpen ?? true);

        // Extract employer data
        const employer = pos.employer || pos.Employer;
        if (employer) {
          console.log('🔍 Employer data from API:', employer);
          console.log('🔍 Company size value:', employer.companySize || employer.CompanySize);
          setEmployerData({
            companyName: employer.companyName || employer.CompanyName || '',
            logoUrl: employer.logoUrl || employer.LogoUrl || null,
            companyDescription: employer.companyDescription || employer.CompanyDescription || '',
            website: employer.website || employer.Website || '',
            companySize: employer.companySize !== null && employer.companySize !== undefined ? employer.companySize : (employer.CompanySize !== null && employer.CompanySize !== undefined ? employer.CompanySize : null),
            city: employer.city || employer.City || '',
            state: employer.state || employer.State || ''
          });
          console.log('✅ Employer data set:', {
            companyName: employer.companyName || employer.CompanyName || '',
            logoUrl: employer.logoUrl || employer.LogoUrl || null,
            companyDescription: employer.companyDescription || employer.CompanyDescription || '',
            website: employer.website || employer.Website || '',
            companySize: employer.companySize !== null && employer.companySize !== undefined ? employer.companySize : (employer.CompanySize !== null && employer.CompanySize !== undefined ? employer.CompanySize : null),
            city: employer.city || employer.City || '',
            state: employer.state || employer.State || ''
          });
        }

        // Sign poster video URL if it's a path-only blob reference
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
          if (rawVideoPath) {
            const signed = await signBlobUrl(rawVideoPath, token);
            if (signed) {
              setSignedPosterVideoUrl(signed);
            } else {
              // Fallback: ensure absolute path if path-only
              const fallback = (rawVideoPath.startsWith('http://') || rawVideoPath.startsWith('https://'))
                ? rawVideoPath
                : (rawVideoPath.startsWith('/') ? rawVideoPath : `/${rawVideoPath}`);
              setSignedPosterVideoUrl(fallback);
            }
          } else {
            setSignedPosterVideoUrl('');
          }
        } catch (e) {
          console.warn('Failed to sign poster video URL', e);
          setSignedPosterVideoUrl(rawVideoPath);
        }
      }catch(err){ console.error(err); setError('Failed to load position'); }
      finally{ if (!cancelled) setLoading(false); }
    }
    load();
    return ()=>{ cancelled = true; }
  },[id]);

  function addSkill(){ const v = (skillInput||'').trim(); if(!v) return; if(skills.includes(v)){ setSkillInput(''); return;} setSkills([...skills, v]); setSkillInput(''); }
  function removeSkill(s){ setSkills(skills.filter(x=>x!==s)); }
  function addExperience(){ const v = (experienceInput||'').trim(); if(!v) return; if(experiences.includes(v)){ setExperienceInput(''); return; } setExperiences([...experiences, v]); setExperienceInput(''); }
  function removeExperience(x){ setExperiences(experiences.filter(e=>e!==x)); }
  function toggleEducation(level){ if (education.includes(level)) setEducation(education.filter(l=>l!==level)); else setEducation([...education, level]); }

  function unformatInput(str){ if (!str && str !== 0) return ''; const cleaned = String(str).replace(/,/g, '').replace(/[^0-9.]/g, ''); const firstDot = cleaned.indexOf('.'); if (firstDot === -1) return cleaned; const before = cleaned.slice(0, firstDot + 1); const after = cleaned.slice(firstDot + 1).replace(/\./g, ''); return before + after; }
  function formatWithCommas(val){ if (val === null || val === undefined || val === '') return ''; const s = String(val); const parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); if (parts.length > 1) return parts[0] + '.' + parts[1].slice(0,2); return parts[0]; }

  async function submit(e){ 
    e.preventDefault(); 
    setError(''); 
    if (!title) { setError('Job title required'); return; } 
    setLoading(true);

    console.log('🚀 Form submit triggered');
    console.log('📊 Initial state:', {
      title,
      posterVideoFile: posterVideoFile ? {
        name: posterVideoFile.name,
        size: posterVideoFile.size,
        type: posterVideoFile.type
      } : null,
      posterVideoUrl,
      removeVideo,
      videoUploading
    });

    // Track the current video URL for the payload
    let currentVideoUrl = posterVideoUrl;

    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;

      // Handle video upload/replacement/removal
      console.log('🎬 Video operation check:', {
        hasPosterVideoFile: !!posterVideoFile,
        hasRemoveVideo: removeVideo,
        condition: posterVideoFile || removeVideo
      });

      if (posterVideoFile || removeVideo){
        console.log('🎬 Starting video operations...');
        setVideoUploading(true);
        setVideoProgress(0);

        try{
          // Delete existing video if it exists and we're replacing or removing
          if (posterVideoUrl && posterVideoUrl.length > 0 && (posterVideoFile || removeVideo)){
            console.log('🔄 Attempting to delete existing video:', posterVideoUrl);
            console.log('📊 Video URL details:', {
              url: posterVideoUrl,
              length: posterVideoUrl.length,
              hasQuery: posterVideoUrl.includes('?'),
              domain: posterVideoUrl.split('/')[2],
              path: posterVideoUrl.split('/').slice(3).join('/')
            });

            try {
              const deleteResult = await fetch(`${API}/api/uploads/delete-poster-video`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ url: posterVideoUrl })
              });

              const deleteResponse = await deleteResult.json().catch(() => ({}));
              console.log('🗑️ Delete API Response:', {
                status: deleteResult.status,
                statusText: deleteResult.statusText,
                response: deleteResponse
              });

              if (!deleteResult.ok){
                console.error('❌ Failed to delete existing video:', deleteResponse);
                // Show user-friendly error but don't block the upload
                setError(`Warning: Could not delete old video (${deleteResponse.error || 'Unknown error'}), but new video will still be uploaded.`);
              } else {
                console.log('✅ Existing video deleted successfully');
              }
            } catch (deleteError) {
              console.error('❌ Error calling delete API:', deleteError);
              setError('Warning: Could not delete old video, but new video will still be uploaded.');
            }
          }

          // If we're uploading a new video
          console.log('🎬 Video upload check:', {
            hasPosterVideoFile: !!posterVideoFile,
            posterVideoFileName: posterVideoFile?.name,
            posterVideoFileSize: posterVideoFile?.size,
            removeVideo: removeVideo
          });

          if (posterVideoFile){
            console.log('🎬 Starting video upload process...');
            // Upload new video
            const fd = new FormData();
            fd.append('file', posterVideoFile, posterVideoFile.name);
            const xhr = new XMLHttpRequest();
            const upUrl = `${API}/api/uploads/poster-video`;

            const uploadResult = await new Promise((resolve,reject)=>{
              console.log('📤 Starting video upload to:', upUrl);
              console.log('📤 File details:', {
                name: posterVideoFile.name,
                size: posterVideoFile.size,
                type: posterVideoFile.type
              });

              xhr.upload.onprogress = (ev)=>{
                if (ev.lengthComputable) {
                  const progress = Math.round((ev.loaded/ev.total)*100);
                  setVideoProgress(progress);
                  console.log('📊 Upload progress:', progress + '%');
                }
              };

              xhr.onreadystatechange = ()=>{
                console.log('📡 XMLHttpRequest state change:', {
                  readyState: xhr.readyState,
                  status: xhr.status,
                  statusText: xhr.statusText,
                  responseText: xhr.responseText
                });

                if (xhr.readyState===4){
                  console.log('📡 Upload complete - raw response:', xhr.responseText);
                  try{
                    const json = xhr.responseText? JSON.parse(xhr.responseText) : {};
                    console.log('📡 Parsed response:', json);

                    if (xhr.status>=200 && xhr.status<300) {
                      console.log('✅ Upload successful');
                      resolve(json);
                    } else {
                      console.error('❌ Upload failed with status:', xhr.status);
                      reject(new Error(json?.message || json?.error || `Upload failed (${xhr.status})`));
                    }
                  } catch(err){
                    console.error('❌ Error parsing upload response:', err);
                    console.error('❌ Raw response text:', xhr.responseText);
                    reject(err);
                  }
                }
              };

              xhr.onerror = (error) => {
                console.error('❌ XMLHttpRequest error:', error);
                reject(new Error('Network error during upload'));
              };

              xhr.open('POST', upUrl);
              if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              console.log('📤 Sending upload request...');
              xhr.send(fd);
            });

            if (uploadResult?.url){
              console.log('✅ Upload result URL:', uploadResult.url);
              setPosterVideoUrl(uploadResult.url);
              console.log('✅ PosterVideoUrl state updated to:', uploadResult.url);
              // Use the URL directly from upload result for the payload
              currentVideoUrl = uploadResult.url;
            } else {
              console.error('❌ Upload result missing URL:', uploadResult);
              throw new Error('Upload succeeded but no URL returned');
            }
          } else if (removeVideo) {
            // If we're just removing the video, clear the URL
            console.log('🗑️ Removing video - current posterVideoUrl:', posterVideoUrl);
            setPosterVideoUrl('');
            console.log('✅ Video removed successfully - posterVideoUrl set to empty string');
            currentVideoUrl = ''; // Update our local variable too
          }
        }catch(err){
          console.error('❌ Video operation failed:', err);
          setError(`Video operation failed: ${err.message}`);
          setVideoUploading(false);
          return; // Stop here if video operation fails
        } finally{
          setVideoUploading(false);
          setRemoveVideo(false);
        }
      }

      // Ensure any un-added input text is captured on save
      const finalExperiences = experiences.concat((experienceInput || '').trim() ? [(experienceInput || '').trim()] : []);
      const finalSkills = skills.concat((skillInput || '').trim() ? [(skillInput || '').trim()] : []);

      const payload = {
        Title: title,
        Category: category,
        Description: description,
        EmploymentType: employmentType,
        WorkSetting: workSetting,
        TravelRequirements: travel,
        EducationLevels: education,
        Experiences: finalExperiences,
        Skills: finalSkills,
        SalaryType: salaryType === 'None' ? null : salaryType,
        SalaryValue: null,
        SalaryMin: salaryMin !== '' ? parseFloat(salaryMin) : null,
        SalaryMax: salaryMax !== '' ? parseFloat(salaryMax) : null,
        PosterVideoUrl: currentVideoUrl && currentVideoUrl.length>0 ? currentVideoUrl : null
      };

      console.log('📤 Sending payload to update position:', payload);
      console.log('📤 PosterVideoUrl in payload:', payload.PosterVideoUrl);
      console.log('📤 Current posterVideoUrl state:', posterVideoUrl);
      console.log('📤 Current currentVideoUrl variable:', currentVideoUrl);

      const res = await fetch(`${API}/api/positions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 API Response status:', res.status);

      if (!res.ok){
        const txt = await res.text();
        console.error('❌ API Error response:', txt);
        throw new Error(txt || `Update failed (${res.status})`);
      }

      const responseData = await res.json();
      console.log('✅ Position updated successfully:', responseData);
      router.push('/poster/dashboard');
    }catch(err){ console.error(err); setError(err?.message || 'Update failed'); }
    finally{ setLoading(false); }
  }

  if (loading) return <Layout title="Edit position"><div>Loading…</div></Layout>;

  return (
    <Layout title={`Edit Position ${id}`}>
      <h2>Edit Position</h2>
      <form className="mt-3" onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">Job Title</label>
          <input className="form-control" value={title} onChange={e=>setTitle(e.target.value)} />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Job Category / Function</label>
            <select className="form-select" value={category} onChange={e=>setCategory(e.target.value)}>
              {JOB_CATEGORIES.map(c=> <option key={c[0]} value={c[0]}>{c[0]}</option>)}
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Employment Type</label>
            <select className="form-select" value={employmentType} onChange={e=>setEmploymentType(e.target.value)}>
              {EMPLOYMENT_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Upload short video explaining the role or company</label>
            <input type="file" accept="video/*" className="form-control" onChange={e=>{
              const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
              setPosterVideoFile(file);
              // If user clears the file input and there's an existing video, mark for removal
              if (!file && posterVideoUrl) {
                setRemoveVideo(true);
              } else {
                setRemoveVideo(false);
              }
            }} />
            {videoUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${videoProgress}%`}} aria-valuenow={videoProgress} aria-valuemin="0" aria-valuemax="100">{videoProgress}%</div></div></div>}
            {posterVideoUrl && (
              <div className="mt-2 d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-link btn-sm ps-0 text-decoration-none"
                  onClick={() => setShowVideoModal(true)}
                >
                  <i className="fas fa-video me-1"></i>Current poster video
                </button>
                {removeVideo ? (
                  <span className="badge bg-warning text-dark">
                    <i className="fas fa-exclamation-triangle me-1"></i>Will be removed on save
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      if (confirm('Are you sure you want to remove the current video?')) {
                        setRemoveVideo(true);
                        setPosterVideoFile(null);
                        // Clear the file input
                        const fileInput = document.querySelector('input[type="file"][accept="video/*"]');
                        if (fileInput) fileInput.value = '';
                      }
                    }}
                    disabled={videoUploading}
                  >
                    <i className="fas fa-trash"></i> Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Job Summary / Description</label>
          <textarea className="form-control" rows={6} value={description} onChange={e=>setDescription(e.target.value)} />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Work Setting</label>
            <select className="form-select" value={workSetting} onChange={e=>setWorkSetting(e.target.value)}>
              {WORK_SETTINGS.map(w=> <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Travel Requirements</label>
            <select className="form-select" value={travel} onChange={e=>setTravel(e.target.value)}>
              <option value="">Select</option>
              <option value="No">No travel required</option>
              <option value="Maybe">Occasional travel</option>
              <option value="Yes">Frequent travel required</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Education level (select one or more)</label>
          <div>
            {EDUCATION_LEVELS.map(l=> (
              <div className="form-check form-check-inline" key={l}>
                <input className="form-check-input" type="checkbox" id={`edu-${l}`} checked={education.includes(l)} onChange={()=>toggleEducation(l)} />
                <label className="form-check-label" htmlFor={`edu-${l}`}>{l}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Experience (add one or more)</label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={experienceInput} onChange={e=>setExperienceInput(e.target.value)} placeholder="e.g., 3+ years in software development" />
            <button type="button" className="btn btn-outline-secondary" onClick={addExperience}>Add</button>
          </div>
          <div>
            {experiences.map(x=> <span key={x} className="badge bg-secondary me-1">{x} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeExperience(x)}>x</button></span>)}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Skills</label>
          <div className="d-flex gap-2 mb-2">
              <SkillAutocomplete 
                value={skillInput} 
                onChange={e=>setSkillInput(e.target.value)} 
                onAdd={addSkill}
                placeholder="Type to search skills..."
              />
            <button type="button" className="btn btn-outline-secondary" onClick={addSkill}>Add</button>
          </div>
          <div>
            {skills.map(s=> <span key={s} className="badge bg-secondary me-1">{s} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeSkill(s)}>x</button></span>)}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Salary (optional)</label>
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <select className="form-select" value={salaryType} onChange={e=>{ setSalaryType(e.target.value); setSalaryMin(''); setSalaryMax(''); }}>
                <option value="None">None</option>
                <option value="Hourly">Hourly</option>
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>

            <div className="col-md-9">
              {salaryType !== 'None' ? (
                <div className="d-flex gap-2">
                  <input className="form-control" placeholder="Min" value={formatWithCommas(salaryMin)} onChange={e=>setSalaryMin(unformatInput(e.target.value))} />
                  <input className="form-control" placeholder="Max" value={formatWithCommas(salaryMax)} onChange={e=>setSalaryMax(unformatInput(e.target.value))} />
                </div>
              ) : <div className="small text-muted">No salary specified</div>}
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading? 'Saving…' : 'Save'}</button>
          <button
            type="button"
            className="btn btn-outline-info"
            onClick={() => {
              console.log('Preview button clicked');
              console.log('Current showPreviewModal:', showPreviewModal);
              setShowPreviewModal(true);
              console.log('Setting showPreviewModal to true');
            }}
            disabled={loading}
          >
            Preview Job Post
          </button>
          {isOpen ? (
            <button type="button" className="btn btn-danger" disabled={loading} onClick={async ()=>{
            if (!confirm('Close this position? It will no longer be open for applicants.')) return;
            setLoading(true); setError('');
            try{
              const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
              const res = await fetch(`${API}/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ IsOpen: false }) });
              if (!res.ok){ const txt = await res.text(); throw new Error(txt || `Close failed (${res.status})`); }
              router.push('/poster/dashboard');
            }catch(err){ console.error(err); setError(err?.message || 'Close failed'); }
            finally{ setLoading(false); }
          }}>Close position</button>
          ) : (
            <button type="button" className="btn btn-outline-success" disabled={loading} onClick={async ()=>{
              if (!confirm('Re-open this position? It will be visible to applicants.')) return;
              setLoading(true); setError('');
              try{
                const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
                const res = await fetch(`${API}/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ IsOpen: true }) });
                if (!res.ok){ const txt = await res.text(); throw new Error(txt || `Reopen failed (${res.status})`); }
                router.push('/poster/dashboard');
              }catch(err){ console.error(err); setError(err?.message || 'Reopen failed'); }
              finally{ setLoading(false); }
            }}>Reopen position</button>
          )}
          <Link href="/poster/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>

      {/* Poster Video Preview Modal */}
      {showVideoModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowVideoModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Poster Video</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowVideoModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body text-center">
                { (signedPosterVideoUrl || posterVideoUrl) ? (
                  <video
                    src={signedPosterVideoUrl || (posterVideoUrl.startsWith('http') ? posterVideoUrl : (posterVideoUrl.startsWith('/') ? posterVideoUrl : `/${posterVideoUrl}`))}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '70vh', outline: 'none' }}
                  />
                ) : (
                  <p className="text-muted">No video uploaded</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVideoModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Job Post Modal */}
      <JobPostCard
        position={{
          id: id,
          title: title,
          category: category,
          description: description,
          employmentType: employmentType,
          workSetting: workSetting,
          travelRequirements: travel,
          education: education,
          experiences: [
            ...experiences,
            ...(experienceInput && experienceInput.trim() ? [experienceInput.trim()] : [])
          ],
          skills: [
            ...skills,
            ...(skillInput && skillInput.trim() ? [skillInput.trim()] : [])
          ],
          salaryType: salaryType,
          salaryMin: salaryMin !== '' ? parseFloat(salaryMin) : null,
          salaryMax: salaryMax !== '' ? parseFloat(salaryMax) : null,
          posterVideoUrl: signedPosterVideoUrl || posterVideoUrl,
          // Real employer data from API
          companyName: employerData.companyName,
          companyLogo: employerData.logoUrl,
          companyDescription: employerData.companyDescription,
          companyWebsite: employerData.website,
          companySize: employerData.companySize,
          city: employerData.city,
          state: employerData.state
        }}
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
      />

    </Layout>
  )
}

