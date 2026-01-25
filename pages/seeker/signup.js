import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import SkillAutocomplete from '../../components/SkillAutocomplete';
import DegreeAutocomplete from '../../components/DegreeAutocomplete';
import UniversityAutocomplete from '../../components/UniversityAutocomplete';
import VideoPlayer from '../../components/VideoPlayer';
import Select from 'react-select';
import { State, City } from 'country-state-city';
import { API_CONFIG } from '../../config/api';

export default function SeekerSignup(){
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    city: '', state: '', professionalSummary: '', jobCategory: '',
  experience: [], education: [], visaStatus: '', preferredSalary: '', workSetting: [], travel: '', relocate: '', languages: [], certifications: [], interests: ''
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  // Experience entry helpers
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpStart, setNewExpStart] = useState('');
  const [newExpEnd, setNewExpEnd] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  // Education entry helpers
  const EDUCATION_LEVELS = ["High School","Associate's","Bachelor's","Master's","Doctorate","None"];
  
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
  const [newEduLevel, setNewEduLevel] = useState(EDUCATION_LEVELS[0]);
    const [newEduDegree, setNewEduDegree] = useState('');
    const [degreeInput, setDegreeInput] = useState('');
  const [newEduSchool, setNewEduSchool] = useState('');
  const [newEduStart, setNewEduStart] = useState('');
  const [newEduEnd, setNewEduEnd] = useState('');
  const [editingEduIndex, setEditingEduIndex] = useState(null);
  const [showEduModal, setShowEduModal] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [showExpModal, setShowExpModal] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [showHeadshotModal, setShowHeadshotModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightUpload, setHighlightUpload] = useState(false);
  const videoInputRef = useRef(null);

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

  useEffect(()=>{
    // briefly highlight the upload container when arriving on step 4
    if (step === 4){
      setHighlightUpload(true);
      const t = setTimeout(()=> setHighlightUpload(false), 800);
      return ()=> clearTimeout(t);
    }
  }, [step]);

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
    // Step 2: All fields required
    if (step === 2){
      if (!form.firstName || !form.firstName.trim()) { setError('First name is required'); return; }
      if (!form.lastName || !form.lastName.trim()) { setError('Last name is required'); return; }
      if (!form.email || !form.email.trim()) { setError('Email is required'); return; }
      if (!form.email.includes('@')) { setError('Email must contain @'); return; }
      if (!confirmEmail || !confirmEmail.trim()) { setError('Please confirm your email'); return; }
      if (form.email.trim() !== confirmEmail.trim()) { setError('Emails do not match'); return; }
      if (!form.phoneNumber || !form.phoneNumber.trim()) { setError('Phone number is required'); return; }
      if (!/^\d{10}$/.test(form.phoneNumber.trim())) { setError('Phone must be 10 digits (e.g., 6185548878)'); return; }
      if (!password || password.length < 8) { setError('Password is required and must be at least 8 characters'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
      if (!form.experience || form.experience.length < 1) { setError('At least one experience entry is required'); return; }
      if (!skills || skills.length < 1) { setError('At least one skill is required'); return; }
      if (!form.education || form.education.length < 1) { setError('At least one education entry is required'); return; }
      if (!form.visaStatus || !form.visaStatus.trim()) { setError('Visa status is required'); return; }
      if (!form.state || !form.state.trim()) { setError('State is required'); return; }
      if (!form.city || !form.city.trim()) { setError('City is required'); return; }
      if (!form.jobCategory || !form.jobCategory.trim()) { setError('Job category is required'); return; }
      if (!form.professionalSummary || !form.professionalSummary.trim()) { setError('Professional summary is required'); return; }
      setForm(prev=>({...prev, password}));
    }
    // Step 3: All fields required
    if (step === 3) {
      if (!form.preferredSalary && (!salaryMin || !salaryMax)) { setError('Preferred salary is required'); return; }
      if (salaryMin && salaryMax) {
        const minVal = Number(unformatInput(salaryMin));
        const maxVal = Number(unformatInput(salaryMax));
        if (!Number.isNaN(minVal) && !Number.isNaN(maxVal) && maxVal <= minVal) {
          setError('Maximum salary must be greater than minimum');
          return;
        }
      }
      if (!form.workSetting || form.workSetting.length < 1) { setError('Preferred work setting is required'); return; }
      if (!form.travel || !form.travel.trim()) { setError('Travel preference is required'); return; }
      if (!form.relocate || !form.relocate.trim()) { setError('Relocation preference is required'); return; }
      if (!form.languages || form.languages.length < 1) { setError('At least one language is required'); return; }
      // certifications and interests now optional
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

  async function validateAndSetVideoFile(f){
    if (!f){ setVideoFile(null); setError('Please upload your intro video.'); return; }
    const allowedTypes = ['video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(f.type)){
      setError('Unsupported format — please use mp4 or mov.');
      setVideoFile(null);
      return;
    }
    const maxSize = 50 * 1024 * 1024;
    if (f.size > maxSize){ setError('File too large — must be under 50 MB.'); setVideoFile(null); return; }
    const durationOk = await new Promise((resolve)=>{
      const url = URL.createObjectURL(f);
      const v = document.createElement('video');
      v.preload = 'metadata'; v.src = url;
      v.onloadedmetadata = () => {
        const d = v.duration || 0;
        URL.revokeObjectURL(url);
        if (d < 10) { setError('Video is too short. Aim for ~20 seconds.'); resolve(false); return; }
        if (d > 25) { setError('Video is too long. Aim for ~20 seconds.'); resolve(false); return; }
        resolve(true);
      };
      v.onerror = () => { URL.revokeObjectURL(url); setError('Could not read video metadata. Please try another file.'); resolve(false); };
    });
    if (!durationOk){ setVideoFile(null); return; }
    setError(''); setVideoFile(f);
  }

  async function onVideoSelect(e){
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    await validateAndSetVideoFile(f);
  }

  const onDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer?.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
    await validateAndSetVideoFile(f);
  };

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

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
    // All fields required on submit
    if (!form.firstName || !form.firstName.trim()) { setError('First name is required'); setStep(2); return; }
    if (!form.lastName || !form.lastName.trim()) { setError('Last name is required'); setStep(2); return; }
    if (!form.email || !form.email.trim()) { setError('Email is required'); setStep(2); return; }
    if (!form.email.includes('@')) { setError('Email must contain @'); setStep(2); return; }
    if (!confirmEmail || !confirmEmail.trim()) { setError('Please confirm your email'); setStep(2); return; }
    if (form.email.trim() !== confirmEmail.trim()) { setError('Emails do not match'); setStep(2); return; }
    if (!form.phoneNumber || !form.phoneNumber.trim()) { setError('Phone number is required'); setStep(2); return; }
    if (!/^\d{10}$/.test(form.phoneNumber.trim())) { setError('Phone must be 10 digits (e.g., 6185548878)'); setStep(2); return; }
    if (!password || password.length < 8) { setError('Password is required and must be at least 8 characters'); setStep(2); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); setStep(2); return; }
    if (!form.experience || form.experience.length < 1) { setError('At least one experience entry is required'); setStep(2); return; }
    if (!skills || skills.length < 1) { setError('At least one skill is required'); setStep(2); return; }
    if (!form.education || form.education.length < 1) { setError('At least one education entry is required'); setStep(2); return; }
    if (!form.visaStatus || !form.visaStatus.trim()) { setError('Visa status is required'); setStep(2); return; }
    if (!form.state || !form.state.trim()) { setError('State is required'); setStep(2); return; }
    if (!form.city || !form.city.trim()) { setError('City is required'); setStep(2); return; }
    if (!form.jobCategory || !form.jobCategory.trim()) { setError('Job category is required'); setStep(2); return; }
    if (!form.professionalSummary || !form.professionalSummary.trim()) { setError('Professional summary is required'); setStep(2); return; }
    if (!form.preferredSalary && (!salaryMin || !salaryMax)) { setError('Preferred salary is required'); setStep(3); return; }
    if (salaryMin && salaryMax) {
      const minVal = Number(unformatInput(salaryMin));
      const maxVal = Number(unformatInput(salaryMax));
      if (!Number.isNaN(minVal) && !Number.isNaN(maxVal) && maxVal <= minVal) { setError('Maximum salary must be greater than minimum'); setStep(3); return; }
    }
    if (!form.workSetting || form.workSetting.length < 1) { setError('Preferred work setting is required'); setStep(3); return; }
    if (!form.travel || !form.travel.trim()) { setError('Travel preference is required'); setStep(3); return; }
    if (!form.relocate || !form.relocate.trim()) { setError('Relocation preference is required'); setStep(3); return; }
    if (!form.languages || form.languages.length < 1) { setError('At least one language is required'); setStep(3); return; }
    // certifications and interests now optional
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
        Interests: interestsList,
        City: form.city,
        State: form.state,
        ProfessionalSummary: form.professionalSummary,
        JobCategory: form.jobCategory
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
          {step === segments && <span className="badge bg-primary-subtle text-primary">Final step</span>}
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
                    if (parsed.Email) { setForm(prev=>({...prev, email: parsed.Email})); }
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
              <div className="col-md-6 mb-3"><label className="form-label">First Name <span className="text-danger">*</span></label><input className="form-control" required value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} placeholder="First name" /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Last Name <span className="text-danger">*</span></label><input className="form-control" required value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} placeholder="Last name" /></div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Email <span className="text-danger">*</span></label><input type="email" className="form-control" required value={form.email} onChange={e=>setForm({...form, email: e.target.value})} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Confirm Email <span className="text-danger">*</span></label><input type="email" className="form-control" required value={confirmEmail} onChange={e=>setConfirmEmail(e.target.value)} /></div>
            </div>
            <div className="mb-3"><label className="form-label">Phone <span className="text-danger">*</span></label><input className="form-control" required pattern="\d{10}" title="Enter 10 digits, e.g., 6185548878" value={form.phoneNumber} onChange={e=>setForm({...form, phoneNumber: e.target.value})} /></div>

            <div className="mb-3">
              <label className="form-label">Headshot (optional)</label>
              <input type="file" className="form-control" accept="image/*" onChange={e=>setHeadshotFile(e.target.files[0])} />
              {headshotFile && (
                <div className="mt-2">
                  <button type="button" className="btn btn-link btn-sm p-0 text-primary fw-bold" onClick={()=>setShowHeadshotModal(true)}>
                    Preview headshot
                  </button>
                </div>
              )}
              <small className="text-muted">Upload a professional headshot image</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Experience <span className="text-danger">*</span></label>
              <div className="mb-2">
                <button type="button" className="btn btn-primary" onClick={()=>{ setNewExpTitle(''); setNewExpCompany(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); setEditingIndex(null); setShowExpModal(true); }}>Add Experience</button>
              </div>
              <div>
                {(form.experience || []).map((ex, idx)=> (
                  <div key={idx} className="card mb-2">
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{ex.title || 'Untitled'}</strong>
                          {(ex.company || ex.Company) && <div className="small text-muted">{ex.company || ex.Company}</div>}
                        </div>
                        <div>
                          <button type="button" className="btn btn-sm btn-link" onClick={()=>{ setNewExpTitle(ex.title || ''); setNewExpCompany(ex.company || ex.Company || ''); setNewExpStart(ex.StartDate || ex.start || ''); setNewExpEnd(ex.EndDate || ex.end || ''); setNewExpDesc(ex.description || ''); setEditingIndex(idx); setShowExpModal(true); }}>Edit</button>
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
                          <div className="mb-2"><label className="form-label small">Company</label><input className="form-control" value={newExpCompany} onChange={e=>setNewExpCompany(e.target.value)} placeholder="e.g. Microsoft" /></div>
                          <div className="row">
                            <div className="col-6 mb-2"><label className="form-label small">Start (month)</label><input type="month" className="form-control" value={newExpStart} onChange={e=>setNewExpStart(e.target.value)} /></div>
                            <div className="col-6 mb-2"><label className="form-label small">End (month)</label><input type="month" className="form-control" value={newExpEnd} onChange={e=>setNewExpEnd(e.target.value)} /></div>
                          </div>
                          <div className="mb-2"><label className="form-label small">Description</label><textarea className="form-control" rows={6} value={newExpDesc} onChange={e=>{ const v=e.target.value; if ((v||'').length<=2000) setNewExpDesc(v); }} placeholder="Describe your role and accomplishments (up to ~300 words)"></textarea></div>
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={()=>{ setShowExpModal(false); setEditingIndex(null); setNewExpTitle(''); setNewExpCompany(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); }}>Cancel</button>
                          <button type="button" className="btn btn-primary" onClick={()=>{
                            const title = (newExpTitle||'').trim(); const company = (newExpCompany||'').trim(); const start = (newExpStart||'').trim(); const end = (newExpEnd||'').trim(); const desc = (newExpDesc||'').trim().slice(0,2000);
                            if (!title && !desc) { setError('Please provide at least a title or description for experience'); return; }
                            const entry = { title, company, StartDate: start, EndDate: end, description: desc };
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
                            setNewExpTitle(''); setNewExpCompany(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); setError('');
                          }}>{editingIndex !== null ? 'Save' : 'Add'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>, document.body)
              }
            </div>

            <div className="mb-3">
              <label className="form-label">Skills (required)</label>
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
              <label className="form-label">Education <span className="text-danger">*</span></label>
                <div className="mb-2"><button type="button" className="btn btn-primary" onClick={()=>{ setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduDegree(''); setDegreeInput(''); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); setEditingEduIndex(null); setShowEduModal(true); }}>Add Education</button></div>
              <div>
                {(form.education || []).map((ed, idx)=> (
                  <div key={idx} className="card mb-2">
                    <div className="card-body p-2 d-flex justify-content-between align-items-start">
                      <div>
                        <div><strong>{ed.School || ed.Level || 'Untitled'}</strong></div>
                          <div className="small text-muted">{ed.Level || ''}{ed.Degree ? ` • ${ed.Degree}` : ''}{((ed.StartDate || ed.start) && (ed.EndDate || ed.end)) ? ` • ${ed.StartDate || ed.start} — ${ed.EndDate || ed.end}` : ((ed.StartDate || ed.start) ? ` • ${ed.StartDate || ed.start}` : ((ed.EndDate || ed.end) ? ` • ${ed.EndDate || ed.end}` : ''))}</div>
                      </div>
                      <div>
                          <button type="button" className="btn btn-sm btn-link" onClick={()=>{ setNewEduLevel(ed.Level || EDUCATION_LEVELS[0]); setNewEduDegree(ed.Degree || ''); setDegreeInput(ed.Degree || ''); setNewEduSchool(ed.School || ''); setNewEduStart(ed.StartDate || ed.start || ''); setNewEduEnd(ed.EndDate || ed.end || ''); setEditingEduIndex(idx); setShowEduModal(true); }}>Edit</button>
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
                            <div className="mb-2">
                              <label className="form-label small">Degree</label>
                              <DegreeAutocomplete 
                                value={degreeInput} 
                                onChange={e => setDegreeInput(e.target.value)} 
                                placeholder="Degree (e.g., Computer Science)" 
                              />
                            </div>
                          <div className="mb-2">
                            <label className="form-label small">University</label>
                            <UniversityAutocomplete
                              value={newEduSchool}
                              onChange={e => setNewEduSchool(e.target.value)}
                              placeholder="Select or type your university"
                            />
                          </div>
                          <div className="row">
                            <div className="col-6 mb-2"><label className="form-label small">Start (month)</label><input type="month" className="form-control" value={newEduStart} onChange={e=>setNewEduStart(e.target.value)} /></div>
                            <div className="col-6 mb-2"><label className="form-label small">End (month)</label><input type="month" className="form-control" value={newEduEnd} onChange={e=>setNewEduEnd(e.target.value)} /></div>
                          </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={()=>{ setShowEduModal(false); setEditingEduIndex(null); setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduDegree(''); setDegreeInput(''); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); }}>Cancel</button>
                          <button type="button" className="btn btn-primary" onClick={()=>{
                                const level = (newEduLevel||'').trim(); const degree = (degreeInput||'').trim(); const school = (newEduSchool||'').trim(); const start = (newEduStart||'').trim(); const end = (newEduEnd||'').trim();
                            if (!school && !level) { setError('Please provide at least a school name or level'); return; }
                              const entry = { Level: level, Degree: degree, School: school, StartDate: start, EndDate: end };
                            if (editingEduIndex !== null && Number.isInteger(editingEduIndex)){
                              setForm(prev=>{ const arr = Array.isArray(prev.education) ? [...prev.education] : []; arr[editingEduIndex] = entry; return { ...prev, education: arr }; });
                              setEditingEduIndex(null);
                            } else {
                              setForm(prev=> ({ ...prev, education: [ ...(prev.education||[]), entry ] }));
                            }
                                setShowEduModal(false); setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduDegree(''); setDegreeInput(''); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); setError('');
                          }}>{editingEduIndex !== null ? 'Save' : 'Add'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>, document.body)
              }
            </div>
            <div className="mb-3">
              <label className="form-label">Will you require Visa Sponsorship <span className="text-danger">*</span></label>
              <select className="form-select" required value={form.visaStatus || ''} onChange={e=>setForm({...form, visaStatus: e.target.value})}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">State <span className="text-danger">*</span></label>
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
                  aria-required="true"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">City <span className="text-danger">*</span></label>
                <Select
                  options={cityOptions}
                  value={cityOptions.find(option => option.value === form.city) || null}
                  onChange={(selectedOption) => setForm({...form, city: selectedOption ? selectedOption.value : ''})}
                  placeholder="Select your city"
                  isClearable
                  isDisabled={!form.state}
                  aria-required="true"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Job Category / Function <span className="text-danger">*</span></label>
              <select 
                className="form-select" 
                required
                value={form.jobCategory || ''} 
                onChange={e => setForm({...form, jobCategory: e.target.value})}
              >
                <option value="">Select a category</option>
                {JOB_CATEGORIES.map(c => <option key={c[0]} value={c[0]}>{c[0]}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Professional Summary <span className="text-danger">*</span></label>
              <textarea
                className="form-control"
                required
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
                <label className="form-label">Password <span className="text-danger">*</span></label>
                <input type="password" className="form-control" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Choose a password (min 8 chars)" />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Confirm password <span className="text-danger">*</span></label>
                <input type="password" className="form-control" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm password" />
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
              <label className="form-label">Preferred Salary <span className="text-danger">*</span></label>
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
              <label className="form-label">Preferred Work Setting <span className="text-danger">*</span></label>
              <div className="d-flex flex-wrap gap-2">
                {workOptions.map(o=>{
                  const active = (form.workSetting || []).includes(o);
                  return <button type="button" key={o} className={`btn btn-sm ${active? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>{ const cur=form.workSetting||[]; if(cur.includes(o)) setForm({...form, workSetting: cur.filter(x=>x!==o)}); else setForm({...form, workSetting: [...cur, o]}); }}>{o}</button>
                })}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Travel <span className="text-danger">*</span></label>
                <select className="form-select" value={form.travel} onChange={e=>setForm({...form, travel: e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option><option>Maybe</option></select>
              </div>
              <div className="col-md-6 mb-3"><label className="form-label">Relocate <span className="text-danger">*</span></label>
                <select className="form-select" value={form.relocate} onChange={e=>setForm({...form, relocate: e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option><option>Maybe</option></select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Languages <span className="text-danger">*</span></label>
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
              <label className="form-label">Certifications (optional)</label>
              <div className="d-flex gap-2 mb-2">
                <input className="form-control" value={certInput} onChange={e=>setCertInput(e.target.value)} placeholder="Add certification and press Add" />
                <button type="button" className="btn btn-outline-secondary" onClick={addCert}>Add</button>
              </div>
              <div>
                {certificationsList.map(c=> <span key={c} className="badge bg-secondary me-1">{c} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeCert(c)}>x</button></span>)}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Interests / Hobbies (optional)</label>
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
                <section className={`card border rounded-3 p-4 p-md-5 mb-3 ${highlightUpload ? 'shadow' : 'shadow-sm'}`} aria-labelledby="videoUploadHeading">
                  <div className="text-center mb-3">
                    <h2 id="videoUploadHeading" className="h4 fw-semibold mb-1" style={{letterSpacing: '.2px'}}>
                      Upload your 20-second intro video
                    </h2>
                    <p className="text-muted mb-0">
                      Let employers see you — not just your resume.
                    </p>
                  </div>

              <div className="mx-auto mb-4" style={{maxWidth: 720}}>
                <div className="p-3 p-md-4 rounded-3 border bg-light-subtle">
                  <div className="fw-semibold mb-2">How to make a great 20‑second intro</div>
                  <ul className="mb-0 small text-muted ps-3">
                    <li><strong>Keep it short:</strong> ~20 seconds, one clear message.</li>
                    <li><strong>Framing:</strong> Eye‑level camera, center yourself, steady phone.</li>
                    <li><strong>Lighting:</strong> Face a window or soft light; avoid strong backlight.</li>
                    <li><strong>Audio:</strong> Quiet room, speak clearly, avoid echo/background noise.</li>
                    <li><strong>Background:</strong> Clean, uncluttered, and professional‑looking.</li>
                    <li><strong>Script (3 points):</strong> Who you are • what you do best • what you want next.</li>
                    <li><strong>Energy:</strong> Smile, natural tone, authentic confidence.</li>
                    <li><strong>Attire:</strong> Dress for the role and industry you’re targeting.</li>
                  </ul>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-baseline justify-content-between flex-wrap gap-2 mb-2">
                  <label htmlFor="videoUpload" className="form-label m-0">
                    Choose or drag & drop your 20-second intro (mp4 or mov, max 50 MB)
                  </label>
                </div>
                <div
                  className={`rounded-3 border border-2 ${isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-dashed bg-light-subtle'}`}
                  style={{ padding: '1.25rem', cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload intro video by clicking or dragging and dropping a file"
                  aria-describedby="videoUploadHelp"
                  onClick={()=> videoInputRef.current?.click()}
                  onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); videoInputRef.current?.click(); } }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragEnter={onDragEnter}
                  onDragLeave={onDragLeave}
                >
                  <div className="d-flex flex-column align-items-center text-center">
                    <div className="mb-2">
                      <i className="fas fa-cloud-upload-alt text-primary" aria-hidden="true" style={{fontSize:'1.5rem'}}></i>
                    </div>
                    <div className="fw-semibold">Click to upload or drag & drop</div>
                    <div className="small text-muted">mp4 or mov, up to 50 MB, ~20 seconds</div>
                  </div>
                </div>
                <input
                  ref={videoInputRef}
                  id="videoUpload"
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="form-control mt-2"
                  aria-describedby="videoUploadHelp"
                  aria-invalid={!!error}
                  onChange={onVideoSelect}
                  style={{display:'none'}}
                />
                <small id="videoUploadHelp" className="text-muted">Accepted formats: mp4 or mov. Max size: 50 MB. Aim for ~20 seconds.</small>
                {videoFile && (
                  <div className="d-flex align-items-center gap-3 mt-2">
                    <div className="form-text m-0">
                      Selected: {videoFile.name} ({(videoFile.size/(1024*1024)).toFixed(1)} MB)
                    </div>
                    <button type="button" className="btn btn-link btn-sm p-0 text-primary fw-bold" onClick={()=>setShowVideoModal(true)}>
                      Preview video
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 p-3 rounded-3 border bg-light-subtle">
                <div className="fw-semibold mb-1 small text-muted">Why record a quick intro?</div>
                <ul className="mb-0 small text-muted ps-3">
                  <li>Show your personality and communication style.</li>
                  <li>Highlight what you’re best at in your own words.</li>
                  <li>Make it easier for employers to remember you.</li>
                </ul>
              </div>

              {error && <div className="alert alert-danger" role="alert">{error}</div>}

              <div className="d-flex gap-2 mt-2">
                <button type="button" className="btn btn-secondary" onClick={back} aria-label="Go back to previous step">Back</button>
                <button className="btn btn-primary" type="submit" disabled={loading} aria-label="Create profile">
                  {loading ? 'Creating…' : 'Create Profile'}
                </button>
              </div>
            </section>
          </div>
        )}

        {error && <div className="alert alert-danger mt-3">{error}</div>}

        <div className="mt-3 d-flex gap-2 align-items-center">
          <Link href="/seeker/login" className="back-login-btn">Back to login</Link>
        </div>
      </form>

      {/* Signup Preview Modals */}
      {typeof window !== 'undefined' && showVideoModal && ReactDOM.createPortal(
        <>
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}} onClick={()=>setShowVideoModal(false)}></div>
          <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false} onKeyDown={(e)=>{ if(e.key==='Escape') setShowVideoModal(false); }} onClick={(e)=>e.stopPropagation()}>
            <div className="modal-dialog modal-lg" role="document" style={{pointerEvents:'auto'}}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Preview Intro Video</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={()=>setShowVideoModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  {videoFile ? (
                    <VideoPlayer videoUrl={URL.createObjectURL(videoFile)} title="Preview Intro Video" />
                  ) : (
                    <div className="text-center text-muted">No video selected</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowVideoModal(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>, document.body
      )}

      {typeof window !== 'undefined' && showHeadshotModal && ReactDOM.createPortal(
        <>
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}} onClick={()=>setShowHeadshotModal(false)}></div>
          <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false} onKeyDown={(e)=>{ if(e.key==='Escape') setShowHeadshotModal(false); }} onClick={(e)=>e.stopPropagation()}>
            <div className="modal-dialog modal-lg" role="document" style={{pointerEvents:'auto'}}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Preview Headshot</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={()=>setShowHeadshotModal(false)}></button>
                </div>
                <div className="modal-body text-center">
                  {headshotFile ? (
                    <img alt="Headshot preview" style={{maxWidth:'100%', maxHeight:'70vh', objectFit:'contain'}} src={URL.createObjectURL(headshotFile)} />
                  ) : (
                    <div className="text-center text-muted">No headshot selected</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowHeadshotModal(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>, document.body
      )}
    </Layout>
  );
}

