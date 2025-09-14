import Link from 'next/link';
import Layout from '../../../../components/Layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const JOB_CATEGORIES = ['Engineering','Sales','Finance','Marketing','Product','Design','Operations','Human Resources','Customer Success','Legal','IT','Data Science','DevOps','Quality Assurance','Support','Administration','Research','Education','Healthcare','Hospitality','Manufacturing','Retail','Other'];
const EMPLOYMENT_TYPES = ['Full-time','Part-time','Contract','Temporary','Internship'];
const WORK_SETTINGS = ['Remote','In-office','Hybrid','On-site'];
const EDUCATION_LEVELS = ["High School","Associate's","Bachelor's","Master's","Doctorate","None"];

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
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [employmentType, setEmploymentType] = useState(EMPLOYMENT_TYPES[0]);
  const [workSetting, setWorkSetting] = useState(WORK_SETTINGS[0]);
  const [travel, setTravel] = useState('None');
  const [education, setEducation] = useState([]);
  const [experienceInput, setExperienceInput] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [salaryType, setSalaryType] = useState('None');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

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
        setPosterVideoUrl(pos.posterVideoUrl || pos.PosterVideoUrl || '');
        setEmploymentType(pos.employmentType || pos.EmploymentType || EMPLOYMENT_TYPES[0]);
        setWorkSetting(pos.workSetting || pos.WorkSetting || WORK_SETTINGS[0]);
        setTravel(pos.travelRequirements || pos.TravelRequirements || 'None');
        setEducation((pos.educations || pos.Educations || []).map(e=> e.education || e.Education));
        setExperiences((pos.experiences || pos.Experiences || []).map(e=> e.experience || e.Experience));
        setSkills((pos.skillsList || pos.SkillsList || []).map(s=> s.skill || s.Skill));
        setSalaryType(pos.salaryType || pos.SalaryType || 'None');
        setSalaryMin(pos.salaryMin ?? pos.SalaryMin ?? '');
        setSalaryMax(pos.salaryMax ?? pos.SalaryMax ?? '');
  setIsOpen(pos.isOpen ?? pos.IsOpen ?? true);
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

  async function submit(e){ e.preventDefault(); setError(''); if (!title) { setError('Job title required'); return; } setLoading(true);
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      // upload video if selected
      if (posterVideoFile && !posterVideoUrl){ setVideoUploading(true); setVideoProgress(0);
        try{
          const fd = new FormData(); fd.append('file', posterVideoFile, posterVideoFile.name);
          const xhr = new XMLHttpRequest();
          const upUrl = `${API}/api/uploads/poster-video`;
          const uploadResult = await new Promise((resolve,reject)=>{
            xhr.upload.onprogress = (ev)=>{ if (ev.lengthComputable) setVideoProgress(Math.round((ev.loaded/ev.total)*100)); };
            xhr.onreadystatechange = ()=>{ if (xhr.readyState===4){ try{ const json = xhr.responseText? JSON.parse(xhr.responseText) : {}; if (xhr.status>=200 && xhr.status<300) resolve(json); else reject(new Error(json?.message || json?.error || `Upload failed (${xhr.status})`)); } catch(err){ reject(err); } }};
            xhr.open('POST', upUrl);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(fd);
          });
          if (uploadResult?.url) setPosterVideoUrl(uploadResult.url);
        }catch(err){ console.error('Poster video upload failed', err); setError('Poster video upload failed'); } finally{ setVideoUploading(false); }
      }

      const payload = {
        Title: title,
        Category: category,
        Description: description,
        EmploymentType: employmentType,
        WorkSetting: workSetting,
        TravelRequirements: travel,
        EducationLevels: education,
        Experiences: experiences,
        Skills: skills,
        SalaryType: salaryType === 'None' ? null : salaryType,
        SalaryValue: null,
        SalaryMin: salaryMin !== '' ? parseFloat(salaryMin) : null,
        SalaryMax: salaryMax !== '' ? parseFloat(salaryMax) : null,
        PosterVideoUrl: posterVideoUrl && posterVideoUrl.length>0 ? posterVideoUrl : null
      };

      const res = await fetch(`${API}/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify(payload) });
      if (!res.ok){ const txt = await res.text(); throw new Error(txt || `Update failed (${res.status})`); }
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
              {JOB_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
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
            <label className="form-label">Upload short poster video (optional)</label>
            <input type="file" accept="video/*" className="form-control" onChange={e=>setPosterVideoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            {videoUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${videoProgress}%`}} aria-valuenow={videoProgress} aria-valuemin="0" aria-valuemax="100">{videoProgress}%</div></div></div>}
            {posterVideoUrl && <div className="mt-2"><a href={posterVideoUrl} target="_blank" rel="noreferrer">Current poster video</a></div>}
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
            <input className="form-control" value={travel} onChange={e=>setTravel(e.target.value)} placeholder="e.g., None, Up to 20%" />
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
            <input className="form-control" value={skillInput} onChange={e=>setSkillInput(e.target.value)} placeholder="Add skill and press Add" />
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
    </Layout>
  )
}

