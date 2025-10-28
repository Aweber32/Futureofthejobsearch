import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import SkillAutocomplete from '../../components/SkillAutocomplete';
import Select from 'react-select';
import { State, City } from 'country-state-city';
import { API_CONFIG } from '../../config/api';

export default function SeekerSignup(){
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    city: '', state: '', professionalSummary: '',
  experience: [], education: [], visaStatus: '', preferredSalary: '', workSetting: [], travel: '', relocate: '', languages: [], certifications: [], interests: ''
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  // Experience entry helpers
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpStart, setNewExpStart] = useState('');
  const [newExpEnd, setNewExpEnd] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  // Education entry helpers
  const EDUCATION_LEVELS = ["High School","Associate's","Bachelor's","Master's","Doctorate","None"];
  const [newEduLevel, setNewEduLevel] = useState(EDUCATION_LEVELS[0]);
  const [newEduSchool, setNewEduSchool] = useState('');
  const [newEduStart, setNewEduStart] = useState('');
  const [newEduEnd, setNewEduEnd] = useState('');
  const [editingEduIndex, setEditingEduIndex] = useState(null);
  const [showEduModal, setShowEduModal] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [showExpModal, setShowExpModal] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  const API = API_CONFIG.BASE_URL;

  useEffect(()=>{
    // load US states
    const states = State.getStatesOfCountry('US').map(s=>({ value: s.isoCode, label: s.name }));
    setStateOptions(states);
  },[]);

  useEffect(()=>{
    // load cities for selected state
    if (form.state) {
      const cities = City.getCitiesOfState('US', form.state).map(c=>({ value: c.name, label: c.name }));
      setCityOptions(cities);
    } else {
      setCityOptions([]);
    }
  },[form.state]);

  // helpers for skills
  function addSkill(){
    const v = (skillInput || '').trim();
    if (!v) return;
    if (skills.length >= 8) { setError('Maximum 8 skills'); return; }
    if (skills.includes(v)) { setSkillInput(''); return; }
    setSkills([...skills, v]); setSkillInput(''); setError('');
  }
  function removeSkill(s){ setSkills(skills.filter(x=>x!==s)); }

  // Navigation
  function next(){ 
    // validate passwords when moving past step 2
    if (step === 2){
      if (!password || password.length < 8) { setError('Password is required and must be at least 8 characters'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
      // attach password to form so submit will send it
      setForm(prev=>({...prev, password}));
    }
    setError(''); setStep(s => Math.min(4, s+1)); }
  function back(){ setError(''); setStep(s => Math.max(1, s-1)); }

  // Keep previous upload/validation helpers for final submit
  function checkVideoDuration(file){
    return new Promise((resolve)=>{
      if (!file) return resolve(true);
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = url;
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (v.duration && v.duration > 20) return resolve(false);
        resolve(true);
      };
      v.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    });
  }

  function uploadWithProgress(file, endpoint, onProgress, token){
    return new Promise((resolve,reject)=>{
      if (!file) return resolve(null);
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('file', file, file.name);
      xhr.upload.onprogress = (e)=>{ if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onreadystatechange = ()=>{
        if (xhr.readyState === 4){
          try{ const json = xhr.responseText ? JSON.parse(xhr.responseText) : {}; if (xhr.status >= 200 && xhr.status < 300) resolve(json); else reject(new Error(json?.message || json?.error || `Upload failed (${xhr.status})`)); }catch(err){ reject(err); }
        }
      };
      xhr.open('POST', endpoint);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(fd);
    });
  }

  async function onVideoSelect(e){
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!f){ setVideoFile(null); return; }
    const maxSize = 50 * 1024 * 1024;
    if (f.size > maxSize){ setError('Video file is too large (max 50MB)'); setVideoFile(null); return; }
    const ok = await checkVideoDuration(f);
    if (!ok){ setError('Video must be 20 seconds or shorter'); setVideoFile(null); return; }
    setError(''); setVideoFile(f);
  }

  async function parseResumeFile(file){
    if (!file) return null;
    setParsing(true);
    try{
      // if PDF, extract text client-side and send content to /api/parse-resume
      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        const text = await extractPdfText(file);
        if (!text) { setParsing(false); return null; }
        const res = await fetch(`${API}/api/parse-resume`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ Filename: file.name, Content: text }) });
        if (!res.ok){ const txt = await res.text(); console.warn('Parse failed', txt); setParsing(false); return null; }
        const data = await res.json(); setParsing(false); return data;
      }

      const fd = new FormData(); fd.append('file', file, file.name);
      const res2 = await fetch(`${API}/api/parse-resume-file`, { method: 'POST', body: fd });
      if (!res2.ok){ const txt = await res2.text(); console.warn('Parse failed', txt); setParsing(false); return null; }
      const data2 = await res2.json();
      setParsing(false);
      return data2;
    }catch(err){ console.error(err); setParsing(false); return null; }
  }

  async function extractPdfText(file){
    try{
      // Try multiple pdfjs import paths to be resilient to different package layouts
      let pdfjs = null;
      // Try the most common locations for pdfjs (legacy build preferred)
      try { pdfjs = await import('pdfjs-dist/legacy/build/pdf'); }
      catch (err) {
        try { pdfjs = await import('pdfjs-dist/build/pdf'); }
        catch (err2) { /* failed to load pdfjs */ }
      }
      if (!pdfjs) { console.error('pdfjs module not found'); return null; }

      let workerSrc = null;
      try { workerSrc = await import('pdfjs-dist/legacy/build/pdf.worker.entry'); }
      catch (werr) {
        try { workerSrc = await import('pdfjs-dist/build/pdf.worker.entry'); }
        catch (_) { /* no worker found */ }
      }
      if (workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = workerSrc?.default || workerSrc;
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i=1;i<=pdf.numPages;i++){
        const page = await pdf.getPage(i);
        const txt = await page.getTextContent();
        const pageText = txt.items.map(item=> (item.str || '')).join(' ');
        fullText += pageText + '\n\n';
      }
      return fullText;
    }catch(err){ console.error('PDF extract failed', err); return null; }
  }

  async function summarizeText(text){
    try{
  // Use a larger character cap that approximates 300 words (around 2000 characters)
  const res = await fetch(`${API}/api/summarize`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ Text: text, MaxLength: 2000 }) });
  if (!res.ok) return text.slice(0,2000);
  const j = await res.json();
  return (j.summary || text).trim().slice(0,2000);
    }catch(err){ console.error('Summarize failed', err); return text.slice(0,100); }
  }

  async function submit(e){
    e.preventDefault();
    setError('');
  // keep client-side minimal validation: require first, last, and email
  if (!form.firstName || !form.lastName || !form.email) { setError('First name, last name and email required'); setStep(2); return; }
    if (skills.length < 1) { /* not blocking */ }
    setLoading(true);
    try{
      // perform uploads now (only at final submit) and include returned URLs in registration payload
      let resumeUrl = form.resumeUrl || null;
      let videoUrl = form.videoUrl || null;
      let headshotUrl = form.headshotUrl || null;
      try{
        if (resumeFile && !resumeUrl){
          const up = await uploadWithProgress(resumeFile, `${API}/api/uploads/resume`, ()=>{}, null);
          resumeUrl = up?.url || up?.uri || up?.sasUrl || up?.path || null;
        }
      } catch(uerr){ console.error('Resume upload failed', uerr); }
      try{
        if (videoFile && !videoUrl){
          const up2 = await uploadWithProgress(videoFile, `${API}/api/uploads/seeker-video`, ()=>{}, null);
          videoUrl = up2?.url || up2?.uri || up2?.sasUrl || up2?.path || null;
        }
      } catch(uerr){ console.error('Video upload failed', uerr); }
      try{
        if (headshotFile && !headshotUrl){
          const up3 = await uploadWithProgress(headshotFile, `${API}/api/uploads/seeker-headshot`, ()=>{}, null);
          headshotUrl = up3?.url || up3?.uri || up3?.sasUrl || up3?.path || null;
        }
      } catch(uerr){ console.error('Headshot upload failed', uerr); }

      // Combine salary values into preferredSalary
      let combinedSalary = '';
      if (salaryType !== 'None' && (salaryMin || salaryMax)) {
        const min = salaryMin ? formatWithCommas(salaryMin) : '';
        const max = salaryMax ? formatWithCommas(salaryMax) : '';
        if (min && max) {
          combinedSalary = `${salaryType}: $${min} - $${max}`;
        } else if (min) {
          combinedSalary = `${salaryType}: $${min}+`;
        } else if (max) {
          combinedSalary = `${salaryType}: Up to $${max}`;
        }
      }

      const payload = {
        FirstName: form.firstName,
        LastName: form.lastName,
        Email: form.email,
        PhoneNumber: form.phoneNumber,
        Skills: skills,
        Password: password,
        ResumeUrl: resumeUrl,
        VideoUrl: videoUrl,
        HeadshotUrl: headshotUrl,
        Experience: form.experience,
        Education: form.education,
        VisaStatus: form.visaStatus,
        PreferredSalary: combinedSalary || form.preferredSalary,
        WorkSetting: form.workSetting,
        Travel: form.travel,
        Relocate: form.relocate,
        Languages: form.languages,
        Certifications: certificationsList,
        Interests: interestsList
      };

      const res = await fetch(`${API}/api/seekers/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const txt = await res.text(); let data = {};
      try{ data = txt ? JSON.parse(txt) : {}; } catch { data = { message: txt }; }
      if (!res.ok) throw new Error(data.error || data.message || txt || 'Registration failed');

      const seekerId = data.seekerId; const token = data.token; if (token && typeof window !== 'undefined') localStorage.setItem('fjs_token', token);

      router.push('/seeker');
    }catch(err){ console.error(err); setError(err?.message || 'Registration failed'); }
    finally{ setLoading(false); }
  }

  // numeric helpers (copied from create-position helpers)
  function unformatInput(str) {
    if (!str && str !== 0) return "";
    const cleaned = String(str).replace(/,/g, "").replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
    return before + after;
  }
  function formatWithCommas(val) {
    if (val === null || val === undefined || val === "") return "";
    const s = String(val);
    const parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (parts.length > 1) return parts[0] + '.' + parts[1].slice(0,2);
    return parts[0];
  }

  // local UI state for salary-like control
  const [salaryType, setSalaryType] = useState('None');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  // preferred work setting chip toggles
  const workOptions = ['Remote','In-Office','Hybrid','On-Site'];

  // languages input as chips
  const languageOptions = ['English','Mandarin','Spanish','Hindi','Arabic','Bengali','Portuguese','Russian','Japanese','Punjabi','German','Javanese','Wu','Malay','Telugu','Vietnamese','Korean','French','Turkish','Italian','Other'];

  // certifications and interests behave like skills
  const [certificationsList, setCertificationsList] = useState([]);
  const [certInput, setCertInput] = useState('');
  function addCert(){ const v=(certInput||'').trim(); if(!v) return; if(certificationsList.includes(v)){ setCertInput(''); return; } setCertificationsList([...certificationsList,v]); setCertInput(''); }
  function removeCert(c){ setCertificationsList(certificationsList.filter(x=>x!==c)); }

  const [interestsList, setInterestsList] = useState([]);
  const [interestInput, setInterestInput] = useState('');
  function addInterest(){ const v=(interestInput||'').trim(); if(!v) return; if(interestsList.includes(v)){ setInterestInput(''); return; } setInterestsList([...interestsList,v]); setInterestInput(''); }
  function removeInterest(i){ setInterestsList(interestsList.filter(x=>x!==i)); }

  // small progress slider component
  function ProgressSlider({step}){
    const segments = 4;
    const pct = Math.round(((step-1)/(segments-1))*100);
    const [isSliding, setIsSliding] = useState(false);
    const [direction, setDirection] = useState('forward');
    const prevRef = useRef(step);

    useEffect(()=>{
      // determine direction based on previous step
      const prev = prevRef.current;
      setDirection(step > prev ? 'forward' : 'back');
      prevRef.current = step;

      // trigger sliding state briefly to enable/coordinate CSS transitions
      setIsSliding(true);
      const t = setTimeout(()=>setIsSliding(false), 480);
      return ()=>clearTimeout(t);
    }, [step]);

    return (
      <div className={`mb-3 progress-wrap ${isSliding ? (direction==='forward' ? 'sliding-forward' : 'sliding-back') : ''}`}>
        <div className="d-flex justify-content-between mb-1 align-items-center">
          <small className="text-muted">Step {step} of {segments}</small>
        </div>
        <div className="signup-progress-bar mt-2">
          <div className="progress-fill" style={{width: `${pct}%`}}></div>
        </div>
        <div className="signup-step-indicators">
          {[1,2,3,4].map(s=> <div key={s} className={`dot ${s===step? 'active' : ''}`}></div>)}
        </div>
      </div>
    );
  }

  // Top-level render for steps
  return (
    <Layout title="Sign up — Seeker">
      <h2>Sign up as Job Seeker</h2>
      <ProgressSlider step={step} />

      <form onSubmit={submit} className="mt-3">
        {parsing && (
          <div className="parsing-overlay" role="status" aria-live="polite">
            <div className="parsing-card">
              <div className="parsing-spinner" aria-hidden></div>
              <div>
                <div style={{fontWeight:600}}>Parsing resume…</div>
                <div className="small text-muted">We are extracting details from your resume to pre-fill the form.</div>
              </div>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="signup-step-pane enter-active">
            <h4>Upload your resume and let us sign you up!</h4>
            <p className="text-muted">Uploading a resume speeds up your profile creation. You can also skip and fill details manually.</p>
            <div className="mb-3">
              <label className="form-label">Upload resume (PDF)</label>
              <input type="file" accept=".pdf,.txt,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="form-control" onChange={async e=>{
                const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                setResumeFile(f);
                if (f) {
                  setError('');
                  // auto-advance
                  setStep(2);
                  // attempt to parse file
                  const parsed = await parseResumeFile(f);
                  if (parsed) {
                    // populate known fields safely
                      // Name handling: prefer explicit FirstName/LastName, otherwise split FullName/Name
                      if (parsed.FirstName || parsed.LastName) {
                        if (parsed.FirstName) setForm(prev=>({...prev, firstName: parsed.FirstName}));
                        if (parsed.LastName) setForm(prev=>({...prev, lastName: parsed.LastName}));
                      } else if (parsed.FullName || parsed.Name) {
                        const full = String(parsed.FullName || parsed.Name || '').trim();
                        if (full) {
                          const parts = full.split(/\s+/);
                          const first = parts.slice(0, Math.max(1, parts.length-1)).join(' ');
                          const last = parts.length > 1 ? parts.slice(-1).join(' ') : '';
                          setForm(prev=>({...prev, firstName: first, lastName: last}));
                        }
                      }
                    if (parsed.Email) setForm(prev=>({...prev, email: parsed.Email}));
                    if (parsed.PhoneNumber) setForm(prev=>({...prev, phoneNumber: parsed.PhoneNumber}));
                    if (parsed.Experience) {
                      // parsed.Experience may be a string or array. Normalize to structured entries.
                      if (Array.isArray(parsed.Experience)) {
                        // try to map items to {title,start,end,description} if possible and summarize long descriptions
                        const processPromises = parsed.Experience.map(async it => {
                          if (!it) return { title: '', start:'', end:'', description: '' };
                          if (typeof it === 'string') {
                            const desc = it;
                            const short = desc.length > 100 ? await summarizeText(desc) : desc;
                            const t = short.split('\n')[0].slice(0,40);
                            return { title: t, start:'', end:'', description: short };
                          }
                          // helper to read multiple possible keys (case variants)
                          const get = (obj, ...keys) => {
                            for (const k of keys) {
                              if (obj[k] !== undefined && obj[k] !== null) return obj[k];
                              const lower = k.toLowerCase();
                              if (obj[lower] !== undefined && obj[lower] !== null) return obj[lower];
                            }
                            return undefined;
                          };

                          const titleRaw = get(it, 'Title', 'title', 'Position', 'position', 'Role', 'role', 'JobTitle', 'jobTitle', 'job_title');
                          const descRaw = get(it, 'Description', 'description', 'Summary', 'summary', 'details', 'Details') || '';
                          const startRaw = get(it, 'StartDate', 'startDate', 'start', 'from', 'From');
                          const endRaw = get(it, 'EndDate', 'endDate', 'end', 'to', 'To', 'time');

                          const desc = descRaw && String(descRaw).length > 100 ? await summarizeText(String(descRaw)) : String(descRaw || '');
                          let title = String(titleRaw || '').trim();
                          if (!title) {
                            // fallback to first line / first 40 chars of description
                            title = (desc.split('\n')[0] || '').slice(0,40) || '';
                          }

                          const start = startRaw ? String(startRaw) : '';
                          const end = endRaw ? String(endRaw) : '';
                          return { title, StartDate: start, EndDate: end, description: desc };
                        });
                        const entries = await Promise.all(processPromises);
                        setForm(prev=>({...prev, experience: entries}));
                      } else if (typeof parsed.Experience === 'string') {
                        const desc = parsed.Experience;
                        const short = desc.length > 100 ? await summarizeText(desc) : desc;
                        setForm(prev=>({...prev, experience: [{ title:'', StartDate:'', EndDate:'', description: short }]}));
                      } else {
                        // unknown shape, set raw
                        setForm(prev=>({...prev, experience: [parsed.Experience]}));
                      }
                    }
                    if (parsed.Education) {
                      // Normalize parsed.Education into array of entries { level, school, start, end }
                      const norm = (function(src){
                        if (!src) return [];
                        if (Array.isArray(src)) return src.map(it=>{
                          if (!it) return { Level: '', School: '', StartDate: '', EndDate: '' };
                          if (typeof it === 'string') return { Level: '', School: it, StartDate: '', EndDate: '' };
                          // try common keys
                          const get = (o, ...keys) => { for (const k of keys){ if (o[k]!==undefined && o[k]!==null) return o[k]; const lk = k.toLowerCase(); if (o[lk]!==undefined && o[lk]!==null) return o[lk]; } return undefined; };
                          const level = get(it,'Education','Degree','level','Level') || '';
                          const school = get(it,'School','Institution','SchoolName','school','institution') || '';
                          const start = get(it,'StartDate','startDate','start','from') || '';
                          const end = get(it,'EndDate','endDate','end','to') || '';
                          return { Level: String(level), School: String(school), StartDate: String(start), EndDate: String(end) };
                        });
                        if (typeof src === 'string') return [{ Level:'', School: String(src), StartDate:'', EndDate:'' }];
                        return [];
                      })(parsed.Education);
                      setForm(prev=>({...prev, education: norm}));
                    }
                    if (parsed.VisaStatus) setForm(prev=>({...prev, visaStatus: parsed.VisaStatus}));
                    if (Array.isArray(parsed.Skills)) setSkills(parsed.Skills.slice(0,8));
                    if (Array.isArray(parsed.Certifications)) setCertificationsList(parsed.Certifications);
                    if (Array.isArray(parsed.Interests)) setInterestsList(parsed.Interests);
                    if (Array.isArray(parsed.Languages)) setForm(prev=>({...prev, languages: parsed.Languages}));
                    if (parsed.PreferredSalary) setForm(prev=>({...prev, preferredSalary: parsed.PreferredSalary}));
                  }
                }
              }} />
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn skip-btn" onClick={()=>{ setStep(2); }}>Skip and Fill Manually</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="signup-step-pane enter-active">
            <h4>Tell us about you!</h4>
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">First Name</label><input className="form-control" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} placeholder="First name" /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Last Name</label><input className="form-control" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} placeholder="Last name" /></div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} /></div>
            </div>
            <div className="mb-3"><label className="form-label">Phone</label><input className="form-control" value={form.phoneNumber} onChange={e=>setForm({...form, phoneNumber: e.target.value})} /></div>

            <div className="mb-3">
              <label className="form-label">Headshot (Optional)</label>
              <input type="file" className="form-control" accept="image/*" onChange={e=>setHeadshotFile(e.target.files[0])} />
              <small className="text-muted">Upload a professional headshot image</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Experience</label>
              <div className="mb-2">
                <button type="button" className="btn btn-primary" onClick={()=>{ setNewExpTitle(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); setEditingIndex(null); setShowExpModal(true); }}>Add Experience</button>
              </div>
              <div>
                {(form.experience || []).map((ex, idx)=> (
                  <div key={idx} className="card mb-2">
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between">
                        <strong>{ex.title || 'Untitled'}</strong>
                        <div>
                          <button type="button" className="btn btn-sm btn-link" onClick={()=>{ setNewExpTitle(ex.title || ''); setNewExpStart(ex.StartDate || ex.start || ''); setNewExpEnd(ex.EndDate || ex.end || ''); setNewExpDesc(ex.description || ''); setEditingIndex(idx); setShowExpModal(true); }}>Edit</button>
                          <button type="button" className="btn btn-sm btn-link text-danger" onClick={()=>{ setForm(prev=> ({ ...prev, experience: prev.experience.filter((_,i)=>i!==idx) }) ); if (editingIndex !== null && editingIndex === idx) setEditingIndex(null); }}>Remove</button>
                        </div>
                      </div>
                        <div className="small text-muted">{ex.time || ((ex.StartDate || ex.start) && (ex.EndDate || ex.end) ? `${ex.StartDate || ex.start} — ${ex.EndDate || ex.end}` : '')}</div>
                        <div className="mt-2" style={{whiteSpace:'pre-wrap'}}>{ex.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {typeof window !== 'undefined' && showExpModal && ReactDOM.createPortal(
                <>
                  <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}}></div>
                  <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false}>
                    <div className="modal-dialog modal-bottom modal-dialog-centered" role="document" style={{pointerEvents:'auto'}}>
                      <div className="modal-content">
                        <div className="modal-header">
                          <h5 className="modal-title">{editingIndex !== null ? 'Edit Experience' : 'Add Experience'}</h5>
                          <button type="button" className="btn-close" aria-label="Close" onClick={()=>{ setShowExpModal(false); setEditingIndex(null); }}></button>
                        </div>
                        <div className="modal-body">
                          <div className="mb-2"><label className="form-label small">Title</label><input className="form-control" value={newExpTitle} onChange={e=>setNewExpTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" /></div>
                          <div className="row">
                            <div className="col-6 mb-2"><label className="form-label small">Start (month)</label><input type="month" className="form-control" value={newExpStart} onChange={e=>setNewExpStart(e.target.value)} /></div>
                            <div className="col-6 mb-2"><label className="form-label small">End (month)</label><input type="month" className="form-control" value={newExpEnd} onChange={e=>setNewExpEnd(e.target.value)} /></div>
                          </div>
                          <div className="mb-2"><label className="form-label small">Description</label><textarea className="form-control" rows={6} value={newExpDesc} onChange={e=>{ const v=e.target.value; if ((v||'').length<=2000) setNewExpDesc(v); }} placeholder="Describe your role and accomplishments (up to ~300 words)"></textarea></div>
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={()=>{ setShowExpModal(false); setEditingIndex(null); setNewExpTitle(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); }}>Cancel</button>
                          <button type="button" className="btn btn-primary" onClick={()=>{
                            const title = (newExpTitle||'').trim(); const start = (newExpStart||'').trim(); const end = (newExpEnd||'').trim(); const desc = (newExpDesc||'').trim().slice(0,2000);
                            if (!title && !desc) { setError('Please provide at least a title or description for experience'); return; }
                            const entry = { title, StartDate: start, EndDate: end, description: desc };
                            if (editingIndex !== null && Number.isInteger(editingIndex)){
                              setForm(prev=>{
                                const arr = Array.isArray(prev.experience) ? [...prev.experience] : [];
                                arr[editingIndex] = entry;
                                return { ...prev, experience: arr };
                              });
                              setEditingIndex(null);
                            } else {
                              setForm(prev=> ({ ...prev, experience: [ ...(prev.experience||[]), entry ] }));
                            }
                            setShowExpModal(false);
                            setNewExpTitle(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); setError('');
                          }}>{editingIndex !== null ? 'Save' : 'Add'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>, document.body)
              }
            </div>

            <div className="mb-3">
              <label className="form-label">Skills (min 3, max 8)</label>
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
              <label className="form-label">Education</label>
              <div className="mb-2"><button type="button" className="btn btn-primary" onClick={()=>{ setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); setEditingEduIndex(null); setShowEduModal(true); }}>Add Education</button></div>
              <div>
                {(form.education || []).map((ed, idx)=> (
                  <div key={idx} className="card mb-2">
                    <div className="card-body p-2 d-flex justify-content-between align-items-start">
                      <div>
                        <div><strong>{ed.School || ed.Level || 'Untitled'}</strong></div>
                        <div className="small text-muted">{ed.Level || ''}{((ed.StartDate || ed.start) && (ed.EndDate || ed.end)) ? ` • ${ed.StartDate || ed.start} — ${ed.EndDate || ed.end}` : ((ed.StartDate || ed.start) ? ` • ${ed.StartDate || ed.start}` : ((ed.EndDate || ed.end) ? ` • ${ed.EndDate || ed.end}` : ''))}</div>
                      </div>
                      <div>
                        <button type="button" className="btn btn-sm btn-link" onClick={()=>{ setNewEduLevel(ed.Level || EDUCATION_LEVELS[0]); setNewEduSchool(ed.School || ''); setNewEduStart(ed.StartDate || ed.start || ''); setNewEduEnd(ed.EndDate || ed.end || ''); setEditingEduIndex(idx); setShowEduModal(true); }}>Edit</button>
                        <button type="button" className="btn btn-sm btn-link text-danger" onClick={()=>{ setForm(prev=> ({ ...prev, education: (prev.education||[]).filter((_,i)=>i!==idx) }) ); if (editingEduIndex !== null && editingEduIndex === idx) setEditingEduIndex(null); }}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {typeof window !== 'undefined' && showEduModal && ReactDOM.createPortal(
                <>
                  <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}}></div>
                  <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false}>
                    <div className="modal-dialog modal-bottom modal-dialog-centered" role="document" style={{pointerEvents:'auto'}}>
                      <div className="modal-content">
                        <div className="modal-header">
                          <h5 className="modal-title">{editingEduIndex !== null ? 'Edit Education' : 'Add Education'}</h5>
                          <button type="button" className="btn-close" aria-label="Close" onClick={()=>{ setShowEduModal(false); setEditingEduIndex(null); }}></button>
                        </div>
                        <div className="modal-body">
                          <div className="mb-2"><label className="form-label small">Level</label>
                            <select className="form-select" value={newEduLevel} onChange={e=>setNewEduLevel(e.target.value)}>
                              {EDUCATION_LEVELS.map(l=> <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                          <div className="mb-2"><label className="form-label small">School</label><input className="form-control" value={newEduSchool} onChange={e=>setNewEduSchool(e.target.value)} placeholder="e.g. University of Somewhere" /></div>
                          <div className="row">
                            <div className="col-6 mb-2"><label className="form-label small">Start (month)</label><input type="month" className="form-control" value={newEduStart} onChange={e=>setNewEduStart(e.target.value)} /></div>
                            <div className="col-6 mb-2"><label className="form-label small">End (month)</label><input type="month" className="form-control" value={newEduEnd} onChange={e=>setNewEduEnd(e.target.value)} /></div>
                          </div>
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={()=>{ setShowEduModal(false); setEditingEduIndex(null); setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); }}>Cancel</button>
                          <button type="button" className="btn btn-primary" onClick={()=>{
                            const level = (newEduLevel||'').trim(); const school = (newEduSchool||'').trim(); const start = (newEduStart||'').trim(); const end = (newEduEnd||'').trim();
                            if (!school && !level) { setError('Please provide at least a school name or level'); return; }
                            const entry = { Level: level, School: school, StartDate: start, EndDate: end };
                            if (editingEduIndex !== null && Number.isInteger(editingEduIndex)){
                              setForm(prev=>{ const arr = Array.isArray(prev.education) ? [...prev.education] : []; arr[editingEduIndex] = entry; return { ...prev, education: arr }; });
                              setEditingEduIndex(null);
                            } else {
                              setForm(prev=> ({ ...prev, education: [ ...(prev.education||[]), entry ] }));
                            }
                            setShowEduModal(false); setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); setError('');
                          }}>{editingEduIndex !== null ? 'Save' : 'Add'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>, document.body)
              }
            </div>
            <div className="mb-3">
              <label className="form-label">Will you require Visa Sponsership</label>
              <select className="form-select" value={form.visaStatus || ''} onChange={e=>setForm({...form, visaStatus: e.target.value})}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">State</label>
                <Select
                  options={stateOptions}
                  value={stateOptions.find(option => option.value === form.state) || null}
                  onChange={(selectedOption) => {
                    setForm({...form, state: selectedOption ? selectedOption.value : '', city: ''});
                    setCityOptions([]);
                    if (selectedOption) {
                      const cities = City.getCitiesOfState('US', selectedOption.value);
                      setCityOptions(cities.map(city => ({ value: city.name, label: city.name })));
                    }
                  }}
                  placeholder="Select your state"
                  isClearable
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">City</label>
                <Select
                  options={cityOptions}
                  value={cityOptions.find(option => option.value === form.city) || null}
                  onChange={(selectedOption) => setForm({...form, city: selectedOption ? selectedOption.value : ''})}
                  placeholder="Select your city"
                  isClearable
                  isDisabled={!form.state}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Professional Summary</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.professionalSummary || ''}
                onChange={e => setForm({...form, professionalSummary: e.target.value})}
                placeholder="Tell us about yourself, your experience, and what you're looking for in your next role..."
                maxLength={1000}
              />
              <small className="text-muted">{(form.professionalSummary || '').length}/1000 characters</small>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Choose a password (min 8 chars)" />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Confirm password</label>
                <input type="password" className="form-control" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm password" />
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={back}>Back</button>
              <button type="button" className="btn btn-primary" onClick={next}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="signup-step-pane enter-active">
            <h4>Tell us a little more about yourself, our AI will use this to provide the best recommendations</h4>

            <div className="mb-3">
              <label className="form-label">Preferred Salary</label>
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

            <div className="mb-3">
              <label className="form-label">Preferred Work Setting</label>
              <div className="d-flex flex-wrap gap-2">
                {workOptions.map(o=>{
                  const active = (form.workSetting || []).includes(o);
                  return <button type="button" key={o} className={`btn btn-sm ${active? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>{ const cur=form.workSetting||[]; if(cur.includes(o)) setForm({...form, workSetting: cur.filter(x=>x!==o)}); else setForm({...form, workSetting: [...cur, o]}); }}>{o}</button>
                })}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Travel</label>
                <select className="form-select" value={form.travel} onChange={e=>setForm({...form, travel: e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option><option>Maybe</option></select>
              </div>
              <div className="col-md-6 mb-3"><label className="form-label">Relocate</label>
                <select className="form-select" value={form.relocate} onChange={e=>setForm({...form, relocate: e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option><option>Maybe</option></select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Languages</label>
              <div className="d-flex gap-2 flex-wrap mb-2">
                {languageOptions.map(l=>{
                  const active = (form.languages || []).includes(l);
                  return <button type="button" key={l} className={`btn btn-sm ${active? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>{
                    const cur = form.languages || [];
                    if (cur.includes(l)) setForm({...form, languages: cur.filter(x=>x!==l)});
                    else setForm({...form, languages: [...cur, l]});
                  }}>{l}</button>
                })}
              </div>
              {form.languages && form.languages.includes('Other') && <input className="form-control mt-2" placeholder="Please specify other languages" onChange={e=>setForm({...form, languages: form.languages.map(x=> x==='Other' ? e.target.value : x)})} />}
            </div>

            <div className="mb-3">
              <label className="form-label">Certifications</label>
              <div className="d-flex gap-2 mb-2">
                <input className="form-control" value={certInput} onChange={e=>setCertInput(e.target.value)} placeholder="Add certification and press Add" />
                <button type="button" className="btn btn-outline-secondary" onClick={addCert}>Add</button>
              </div>
              <div>
                {certificationsList.map(c=> <span key={c} className="badge bg-secondary me-1">{c} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeCert(c)}>x</button></span>)}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Interests / Hobbies</label>
              <div className="d-flex gap-2 mb-2">
                <input className="form-control" value={interestInput} onChange={e=>setInterestInput(e.target.value)} placeholder="Add interest and press Add" />
                <button type="button" className="btn btn-outline-secondary" onClick={addInterest}>Add</button>
              </div>
              <div>
                {interestsList.map(i=> <span key={i} className="badge bg-secondary me-1">{i} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeInterest(i)}>x</button></span>)}
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={back}>Back</button>
              <button type="button" className="btn btn-primary" onClick={next}>Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="signup-step-pane enter-active">
            <h4>Upload your Personality! Create a 20 second Video, it can be a project you have done, a monologue, make it your own!</h4>
            <div className="mb-3">
              <label className="form-label">Upload 20s intro video (mp4 or mov, max 50MB)</label>
              <input type="file" accept=",.mp4,.mov,video/mp4,video/quicktime" className="form-control" onChange={onVideoSelect} />
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={back}>Back</button>
              <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        )}

        {error && <div className="alert alert-danger mt-3">{error}</div>}

        <div className="mt-3 d-flex gap-2 align-items-center">
          <Link href="/seeker/login" className="back-login-btn">Back to login</Link>
        </div>
      </form>
    </Layout>
  );
}

