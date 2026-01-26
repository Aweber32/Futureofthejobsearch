import Link from 'next/link';
import Layout from '../../../components/Layout';
import SkillAutocomplete from '../../../components/SkillAutocomplete';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { API_CONFIG } from '../../../config/api';
import JobPostCard from '../../../components/JobPostCard';

const API = API_CONFIG.BASE_URL;

// Job categories grouped by related fields
const JOB_CATEGORIES = [
  // Technology & Data (Group 1)
  ['Software Engineering', 1],
  ['Data Engineering', 1],
  ['Data Science & Machine Learning', 1],
  ['Analytics & Business Intelligence', 1],
  ['Cloud & DevOps', 1],
  ['Cybersecurity', 1],
  ['IT Infrastructure & Networking', 1],
  ['QA & Test Engineering', 1],
  ['Mobile Development', 1],
  ['Game Development', 1],
  
  // Product, Design & Project (Group 2)
  ['Product Management', 2],
  ['Program & Project Management', 2],
  ['UX / UI Design', 2],
  ['User Research', 2],
  ['Technical Product Management', 2],
  
  // Business, Finance & Operations (Group 3)
  ['Business Operations', 3],
  ['Strategy & Management Consulting', 3],
  ['Finance & Accounting', 3],
  ['Risk, Compliance & Audit', 3],
  ['Supply Chain & Logistics', 3],
  ['Procurement & Vendor Management', 3],
  
  // Sales, Marketing & Revenue (Group 4)
  ['Sales (B2B / Enterprise)', 4],
  ['Sales (SMB / Mid-Market)', 4],
  ['Sales Operations & Enablement', 4],
  ['Marketing (Brand & Content)', 4],
  ['Marketing (Performance & Growth)', 4],
  ['Product Marketing', 4],
  ['Customer Success', 4],
  ['Account Management', 4],
  ['Revenue Operations', 4],
  
  // People, Legal & Admin (Group 5)
  ['Human Resources & People Operations', 5],
  ['Talent Acquisition & Recruiting', 5],
  ['Learning & Development', 5],
  ['Legal & Contracts', 5],
  ['Office Administration', 5],
  
  // Healthcare & Life Sciences (Group 6)
  ['Clinical Healthcare', 6],
  ['Healthcare Administration', 6],
  ['Health Informatics & Analytics', 6],
  ['Biomedical Engineering', 6],
  ['Pharmaceuticals & Research', 6],
  
  // Creative, Media & Communications (Group 7)
  ['Creative & Visual Design', 7],
  ['Content Writing & Editing', 7],
  ['Media Production (Video / Audio)', 7],
  ['Public Relations & Communications', 7],
  
  // Industry-Specific & Field Roles (Group 8)
  ['Manufacturing & Industrial Engineering', 8],
  ['Construction & Facilities Management', 8],
  ['Energy & Utilities', 8],
  ['Environmental & Sustainability', 8],
  ['Government & Public Sector', 8],
  ['Education & Training', 8]
];
const EMPLOYMENT_TYPES = ['Full-time','Part-time','Contract','Temporary','Internship'];
const WORK_SETTINGS = ['Remote','In-office','Hybrid','On-site'];
const EDUCATION_LEVELS = ["High School","Associate's","Bachelor's","Master's","Doctorate","None"];

export default function CreatePosition(){
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Software Engineering');
  const [description, setDescription] = useState('');
  const [posterVideoFile, setPosterVideoFile] = useState(null);
  const [posterVideoUrl, setPosterVideoUrl] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [workSetting, setWorkSetting] = useState('Remote');
  const [travel, setTravel] = useState('');
  const [education, setEducation] = useState([]);
  const [experienceInput, setExperienceInput] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [salaryType, setSalaryType] = useState('None');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [employerData, setEmployerData] = useState({
    companyName: '',
    logoUrl: null,
    companyDescription: '',
    website: '',
    companySize: null,
    city: '',
    state: ''
  });

  // Load employer data for preview header (company name, logo, etc.)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const emp = data?.employer;
        if (!emp) return;
        setEmployerData({
          companyName: emp.companyName || '',
          logoUrl: emp.logoUrl || null,
          companyDescription: emp.companyDescription || '',
          website: emp.website || '',
          companySize: emp.companySize !== undefined && emp.companySize !== null ? emp.companySize : null,
          city: emp.city || '',
          state: emp.state || ''
        });
      })
      .catch(() => {});
  }, []);

  // helpers to format numbers with commas as the user types
  function unformatInput(str){
    if (!str && str !== 0) return '';
    const cleaned = String(str).replace(/,/g, '').replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, '');
    return before + after;
  }
  function formatWithCommas(val){
    if (val === null || val === undefined || val === '') return '';
    const s = String(val);
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (parts.length > 1) return parts[0] + '.' + parts[1].slice(0,2);
    return parts[0];
  }

  function addSkill(){
    const v = (skillInput || '').trim(); if (!v) return;
    if (skills.includes(v)) { setSkillInput(''); return; }
    setSkills([...skills, v]); setSkillInput('');
  }
  function removeSkill(s){ setSkills(skills.filter(x=>x!==s)); }

  function addExperience(){
    const v = (experienceInput || '').trim(); if (!v) return;
    if (experiences.includes(v)) { setExperienceInput(''); return; }
    setExperiences([...experiences, v]); setExperienceInput('');
  }
  function removeExperience(x){ setExperiences(experiences.filter(e=>e!==x)); }

  function toggleEducation(level){
    if (education.includes(level)) setEducation(education.filter(l=>l!==level));
    else setEducation([...education, level]);
  }

  async function submit(e){
    e.preventDefault(); setError('');
    if (!title?.trim()) { setError('Job title is required'); return; }
    if (!category?.trim()) { setError('Job category is required'); return; }
    if (!description?.trim()) { setError('Job description is required'); return; }
    if (!employmentType?.trim()) { setError('Employment type is required'); return; }
    if (!workSetting?.trim()) { setError('Work setting is required'); return; }
    if (!travel?.trim()) { setError('Travel requirements is required'); return; }
    if (education.length === 0) { setError('Select at least one education level'); return; }
    if (experiences.length === 0 && !experienceInput?.trim()) { setError('Add at least one experience requirement'); return; }
    if (skills.length === 0 && !skillInput?.trim()) { setError('Add at least one skill'); return; }
    if (salaryType === 'None') { setError('Salary type is required'); return; }
    if (salaryType !== 'None' && !salaryMin) { setError('Minimum salary is required'); return; }
    if (salaryType !== 'None' && !salaryMax) { setError('Maximum salary is required'); return; }
    
    // Validate realistic salary values
    if (salaryType !== 'None') {
      const minVal = parseFloat(salaryMin);
      const maxVal = parseFloat(salaryMax);
      
      if (isNaN(minVal) || isNaN(maxVal)) {
        setError('Salary values must be valid numbers');
        return;
      }
      
      // Hourly rate validation ($7.25 federal minimum)
      if (salaryType === 'Hourly') {
        if (minVal < 7.25) {
          setError('Minimum hourly rate must be at least $7.25 (federal minimum wage)');
          return;
        }
      }
      
      // Monthly salary validation ($1,200 minimum)
      if (salaryType === 'Monthly') {
        if (minVal < 1200) {
          setError('Minimum monthly salary must be at least $1,200');
          return;
        }
      }
      
      // Annual salary validation ($15,000 minimum)
      if (salaryType === 'Annual') {
        if (minVal < 15000) {
          setError('Minimum annual salary must be at least $15,000');
          return;
        }
      }
      
      // Min must be less than max
      if (minVal >= maxVal) {
        setError('Minimum salary must be less than maximum salary');
        return;
      }
      
      // Range shouldn't be too small (at least 10% difference)
      if ((maxVal - minVal) / minVal < 0.1) {
        setError('Salary range is too narrow (minimum 10% difference recommended)');
        return;
      }
    }
    
    setLoading(true);
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      // if poster video selected but not uploaded, upload now
      if (posterVideoFile && !posterVideoUrl){
        setVideoUploading(true); setVideoProgress(0);
        try{
          const fd = new FormData(); fd.append('file', posterVideoFile, posterVideoFile.name);
          const xhr = new XMLHttpRequest();
          const upUrl = `${API}/api/uploads/poster-video`;
          const uploadResult = await new Promise((resolve,reject)=>{
            xhr.upload.onprogress = (e)=>{ if (e.lengthComputable) setVideoProgress(Math.round((e.loaded / e.total) * 100)); };
            xhr.onreadystatechange = ()=>{ if (xhr.readyState===4){ try{ const json = xhr.responseText? JSON.parse(xhr.responseText) : {}; if (xhr.status>=200 && xhr.status<300) resolve(json); else reject(new Error(json?.message || json?.error || `Upload failed (${xhr.status})`)); } catch(err){ reject(err); } }};
            xhr.open('POST', upUrl);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(fd);
          });
          if (uploadResult?.url) setPosterVideoUrl(uploadResult.url);
        }catch(err){ console.error('Poster video upload failed', err); setError('Poster video upload failed: ' + (err.message||err)); }
        finally{ setVideoUploading(false); }
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
  PosterVideoUrl: posterVideoUrl && posterVideoUrl.length>0 ? posterVideoUrl : null
      };
      const res = await fetch(`${API}/api/positions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const txt = await res.text(); throw new Error(txt || `Create failed (${res.status})`);
      }
      const data = await res.json();
      router.push('/poster/dashboard');
    }catch(err){ console.error(err); setError(err?.message || 'Create failed'); }
    finally{ setLoading(false); }
  }

  return (
    <Layout title="Create Position">
      <h2>Create position</h2>
      <form className="mt-3" onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">Job Title <span className="text-danger">*</span></label>
          <input className="form-control" value={title} onChange={e=>setTitle(e.target.value)} required />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Job Category / Function <span className="text-danger">*</span></label>
            <select className="form-select" value={category} onChange={e=>setCategory(e.target.value)} required>
              {JOB_CATEGORIES.map(c=> <option key={c[0]} value={c[0]}>{c[0]}</option>)}
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Employment Type <span className="text-danger">*</span></label>
            <select className="form-select" value={employmentType} onChange={e=>setEmploymentType(e.target.value)} required>
              {EMPLOYMENT_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Upload short video explaining the role or company</label>
            <input type="file" accept="video/*" className="form-control" onChange={e=>setPosterVideoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            {videoUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${videoProgress}%`}} aria-valuenow={videoProgress} aria-valuemin="0" aria-valuemax="100">{videoProgress}%</div></div></div>}
          </div>

          <div className="col-md-6 mb-3">
            {/* salary inputs moved to bottom of form per request */}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Job Summary / Description <span className="text-danger">*</span></label>
          <textarea className="form-control" rows={6} value={description} onChange={e=>setDescription(e.target.value)} required />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Work Setting <span className="text-danger">*</span></label>
            <select className="form-select" value={workSetting} onChange={e=>setWorkSetting(e.target.value)} required>
              {WORK_SETTINGS.map(w=> <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Travel Requirements <span className="text-danger">*</span></label>
            <select className="form-select" value={travel} onChange={e=>setTravel(e.target.value)} required>
              <option value="">Select</option>
              <option value="No">No travel required</option>
              <option value="Maybe">Occasional travel</option>
              <option value="Yes">Frequent travel required</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Education level (select one or more) <span className="text-danger">*</span></label>
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
          <label className="form-label">Experience (add one or more) <span className="text-danger">*</span></label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={experienceInput} onChange={e=>setExperienceInput(e.target.value)} placeholder="e.g., 3+ years in software development" />
            <button type="button" className="btn btn-outline-secondary" onClick={addExperience}>Add</button>
          </div>
          <div>
            {experiences.map(x=> <span key={x} className="badge bg-secondary me-1">{x} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeExperience(x)}>x</button></span>)}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Skills <span className="text-danger">*</span></label>
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
          <label className="form-label">Salary <span className="text-danger">*</span></label>
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
            disabled={loading}
            onClick={() => setShowPreviewModal(true)}
          >
            Preview Job Post
          </button>
          <Link href="/poster/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>

      {/* Preview Job Post Modal */}
      <JobPostCard
        position={{
          id: null,
          title,
          category,
          description,
          employmentType,
          workSetting,
          travelRequirements: travel,
          education,
          experiences: [
            ...experiences,
            ...(experienceInput && experienceInput.trim() ? [experienceInput.trim()] : [])
          ],
          skills: [
            ...skills,
            ...(skillInput && skillInput.trim() ? [skillInput.trim()] : [])
          ],
          salaryType,
          salaryMin: salaryMin !== '' ? parseFloat(salaryMin) : null,
          salaryMax: salaryMax !== '' ? parseFloat(salaryMax) : null,
          posterVideoUrl: posterVideoUrl || null,
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
