import { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function EditProfile(){
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    visaStatus: '', preferredSalary: '', travel: '', relocate: ''
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [workSetting, setWorkSetting] = useState([]);
  const [workSettingInput, setWorkSettingInput] = useState('');
  const [languages, setLanguages] = useState([]);
  const [languageInput, setLanguageInput] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [certificationInput, setCertificationInput] = useState('');
  const [interests, setInterests] = useState([]);
  const [interestInput, setInterestInput] = useState('');
  const [experience, setExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [currentResumeUrl, setCurrentResumeUrl] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentHeadshotUrl, setCurrentHeadshotUrl] = useState('');
  const [currentResumeName, setCurrentResumeName] = useState('');
  const [currentVideoName, setCurrentVideoName] = useState('');
  const [currentHeadshotName, setCurrentHeadshotName] = useState('');
  const [resumeProgress, setResumeProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [headshotProgress, setHeadshotProgress] = useState(0);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [headshotUploading, setHeadshotUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seekerId, setSeekerId] = useState(null);

  // Modal states for interactive editing
  const [showExpModal, setShowExpModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingExpIndex, setEditingExpIndex] = useState(null);
  const [editingEduIndex, setEditingEduIndex] = useState(null);
  
  // Modal states for viewing files
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showHeadshotModal, setShowHeadshotModal] = useState(false);
  
  // Experience modal fields
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpStart, setNewExpStart] = useState('');
  const [newExpEnd, setNewExpEnd] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  
  // Education modal fields
  const EDUCATION_LEVELS = ["High School","Associate's","Bachelor's","Master's","Doctorate","None"];
  const [newEduLevel, setNewEduLevel] = useState(EDUCATION_LEVELS[0]);
  const [newEduSchool, setNewEduSchool] = useState('');
  const [newEduStart, setNewEduStart] = useState('');
  const [newEduEnd, setNewEduEnd] = useState('');

  // Salary state variables
  const [salaryType, setSalaryType] = useState('None');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  // Helper functions for salary formatting
  function formatWithCommas(val) {
    if (val === null || val === undefined || val === "") return "";
    const s = String(val);
    const parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (parts.length > 1) return parts[0] + '.' + parts[1].slice(0,2);
    return parts[0];
  }

  function unformatInput(str) {
    if (!str && str !== 0) return "";
    const cleaned = String(str).replace(/,/g, "").replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
    return before + after;
  }

  // Helper function to format dates nicely
  function formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '';
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      // Handle YYYY-MM format from month input
      if (dateStr.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month) - 1];
        return `${monthName} ${year}`;
      }
      // Handle YYYY format
      if (dateStr.match(/^\d{4}$/)) {
        return dateStr;
      }
      // Return as-is for other formats
      return dateStr;
    };
    
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    if (start && end) {
      return `${start} — ${end}`;
    } else if (start) {
      return `${start} — Present`;
    } else if (end) {
      return `Until ${end}`;
    }
    return '';
  }

  useEffect(()=>{
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { router.push('/seeker/login'); return; }
    (async ()=>{
      try{
        const res = await fetch(`${API}/api/seekers/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        console.log('API Response data:', data); // Debug log
        const s = data.seeker ?? data;
        console.log('Seeker data:', s); // Debug log
        setSeekerId(s?.id ?? s?.Id ?? null);
        
        // Load basic form fields
        setForm({
          firstName: s?.firstName ?? s?.FirstName ?? '', 
          lastName: s?.lastName ?? s?.LastName ?? '', 
          email: data.user?.email ?? '', 
          phoneNumber: s?.phoneNumber ?? s?.PhoneNumber ?? '', 
          visaStatus: s?.visaStatus ?? s?.VisaStatus ?? '',
          preferredSalary: s?.preferredSalary ?? s?.PreferredSalary ?? '',
          travel: s?.travel ?? s?.Travel ?? '',
          relocate: s?.relocate ?? s?.Relocate ?? ''
        });
        
        // Load current resume and video URLs
        const resumeUrl = s?.resumeUrl ?? s?.ResumeUrl ?? '';
        const videoUrl = s?.videoUrl ?? s?.VideoUrl ?? '';
        const headshotUrl = s?.headshotUrl ?? s?.HeadshotUrl ?? '';
        setCurrentResumeUrl(resumeUrl);
        setCurrentVideoUrl(videoUrl);
        setCurrentHeadshotUrl(headshotUrl);
        
        // Extract filenames from URLs
        if (resumeUrl) {
          const resumeFileName = resumeUrl.split('/').pop() || 'Current Resume';
          setCurrentResumeName(resumeFileName);
        }
        if (videoUrl) {
          const videoFileName = videoUrl.split('/').pop() || 'Current Video';
          setCurrentVideoName(videoFileName);
        }
        if (headshotUrl) {
          const headshotFileName = headshotUrl.split('/').pop() || 'Current Headshot';
          setCurrentHeadshotName(headshotFileName);
        }
        
        // Parse salary data
        const salaryStr = s?.preferredSalary ?? s?.PreferredSalary ?? '';
        if (salaryStr) {
          console.log('Parsing salary string:', salaryStr); // Debug log
          // Try to parse formatted salary like "Annual: $100,000 - $120,000", "Annual: $100,000+", or "Annual: Up to $120,000"
          let match;
          
          // Check for range format first: "Type: $min - $max"
          match = salaryStr.match(/^(\w+):\s*\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
          if (match) {
            const [, type, min, max] = match;
            console.log('Range format detected:', { type, min, max }); // Debug log
            setSalaryType(type || 'None');
            setSalaryMin(min.replace(/,/g, ''));
            setSalaryMax(max.replace(/,/g, ''));
          } else {
            // Check for minimum only format: "Type: $min+"
            match = salaryStr.match(/^(\w+):\s*\$?([\d,]+)\+/);
            if (match) {
              const [, type, min] = match;
              console.log('Min-only format detected:', { type, min }); // Debug log
              setSalaryType(type || 'None');
              setSalaryMin(min.replace(/,/g, ''));
              setSalaryMax('');
            } else {
              // Check for maximum only format: "Type: Up to $max"
              match = salaryStr.match(/^(\w+):\s*Up to\s*\$?([\d,]+)/);
              if (match) {
                const [, type, max] = match;
                console.log('Max-only format detected:', { type, max }); // Debug log
                setSalaryType(type || 'None');
                setSalaryMin('');
                setSalaryMax(max.replace(/,/g, ''));
              } else {
                // Fallback: if it's just a plain salary string, set it as annual
                console.log('Fallback format detected'); // Debug log
                setSalaryType('Annual');
                setSalaryMin(salaryStr.replace(/[^\d.]/g, ''));
              }
            }
          }
        }
        
        // Load array fields
        const rawSkills = s?.skills ?? s?.Skills ?? '';
        setSkills(rawSkills ? (Array.isArray(rawSkills) ? rawSkills : String(rawSkills).split(',').map(x=>x.trim()).filter(Boolean)) : []);
        
        const rawWorkSetting = s?.workSetting ?? s?.WorkSetting ?? '';
        setWorkSetting(rawWorkSetting ? (Array.isArray(rawWorkSetting) ? rawWorkSetting : String(rawWorkSetting).split(',').map(x=>x.trim()).filter(Boolean)) : []);
        
        const rawLanguages = s?.languages ?? s?.Languages ?? '';
        setLanguages(rawLanguages ? (Array.isArray(rawLanguages) ? rawLanguages : String(rawLanguages).split(',').map(x=>x.trim()).filter(Boolean)) : []);
        
        const rawCertifications = s?.certifications ?? s?.Certifications ?? '';
        setCertifications(rawCertifications ? (Array.isArray(rawCertifications) ? rawCertifications : String(rawCertifications).split(',').map(x=>x.trim()).filter(Boolean)) : []);
        
        const rawInterests = s?.interests ?? s?.Interests ?? '';
        setInterests(rawInterests ? (Array.isArray(rawInterests) ? rawInterests : String(rawInterests).split(',').map(x=>x.trim()).filter(Boolean)) : []);
        
        // Load structured data
        if (s?.experienceJson ?? s?.ExperienceJson) {
          try {
            const expData = JSON.parse(s.experienceJson ?? s.ExperienceJson);
            console.log('Loaded experience data:', expData); // Debug log
            
            // Normalize experience data to ensure consistent property names
            const normalizedExpData = Array.isArray(expData) ? expData.map(exp => ({
              title: exp.title || exp.Title || '',
              startDate: exp.startDate || exp.start || exp.StartDate || exp.Start || '',
              endDate: exp.endDate || exp.end || exp.EndDate || exp.End || '',
              description: exp.description || exp.Description || ''
            })) : [];
            
            console.log('Normalized experience data:', normalizedExpData); // Debug log
            setExperience(normalizedExpData);
          } catch (err) {
            console.error('Error parsing experience JSON:', err); // Debug log
            setExperience([]);
          }
        } else {
          console.log('No experience data found in response'); // Debug log
          setExperience([]);
        }
        
        if (s?.educationJson ?? s?.EducationJson) {
          try {
            const eduData = JSON.parse(s.educationJson ?? s.EducationJson);
            console.log('Loaded education data:', eduData); // Debug log
            
            // Normalize education data to ensure consistent property names
            const normalizedEduData = Array.isArray(eduData) ? eduData.map(edu => ({
              level: edu.level || edu.Level || '',
              school: edu.school || edu.School || '',
              startDate: edu.startDate || edu.start || edu.StartDate || edu.Start || '',
              endDate: edu.endDate || edu.end || edu.EndDate || edu.End || ''
            })) : [];
            
            console.log('Normalized education data:', normalizedEduData); // Debug log
            setEducation(normalizedEduData);
          } catch (err) {
            console.error('Error parsing education JSON:', err); // Debug log
            setEducation([]);
          }
        } else {
          console.log('No education data found in response'); // Debug log
          setEducation([]);
        }
        
      }catch(err){ console.error(err); router.push('/seeker/login'); }
    })();
  },[]);

  function addSkill(){
    const v = (skillInput || '').trim();
    if (!v) return;
    if (skills.length >= 8) { setError('Maximum 8 skills'); return; }
    if (skills.includes(v)) { setSkillInput(''); return; }
    setSkills([...skills, v]); setSkillInput(''); setError('');
  }

  function removeSkill(s){ setSkills(skills.filter(x=>x!==s)); }

  // Work Setting functions
  function addWorkSetting(){
    const v = (workSettingInput || '').trim();
    if (!v) return;
    if (workSetting.includes(v)) { setWorkSettingInput(''); return; }
    setWorkSetting([...workSetting, v]); setWorkSettingInput('');
  }
  function removeWorkSetting(s){ setWorkSetting(workSetting.filter(x=>x!==s)); }

  // Language functions
  function addLanguage(){
    const v = (languageInput || '').trim();
    if (!v) return;
    if (languages.includes(v)) { setLanguageInput(''); return; }
    setLanguages([...languages, v]); setLanguageInput('');
  }
  function removeLanguage(s){ setLanguages(languages.filter(x=>x!==s)); }

  // Certification functions
  function addCertification(){
    const v = (certificationInput || '').trim();
    if (!v) return;
    if (certifications.includes(v)) { setCertificationInput(''); return; }
    setCertifications([...certifications, v]); setCertificationInput('');
  }
  function removeCertification(s){ setCertifications(certifications.filter(x=>x!==s)); }

  // Interest functions
  function addInterest(){
    const v = (interestInput || '').trim();
    if (!v) return;
    if (interests.includes(v)) { setInterestInput(''); return; }
    setInterests([...interests, v]); setInterestInput('');
  }
  function removeInterest(s){ setInterests(interests.filter(x=>x!==s)); }

  // Experience functions - Modal based
  function addExperience(){
    setNewExpTitle('');
    setNewExpStart('');
    setNewExpEnd('');
    setNewExpDesc('');
    setEditingExpIndex(null);
    setShowExpModal(true);
  }
  
  function editExperience(index){
    const exp = experience[index];
    setNewExpTitle(exp.title || '');
    setNewExpStart(exp.StartDate || exp.startDate || exp.start || '');
    setNewExpEnd(exp.EndDate || exp.endDate || exp.end || '');
    setNewExpDesc(exp.description || '');
    setEditingExpIndex(index);
    setShowExpModal(true);
  }
  
  function saveExperience(){
    const title = (newExpTitle || '').trim();
    const start = (newExpStart || '').trim();
    const end = (newExpEnd || '').trim();
    const desc = (newExpDesc || '').trim();
    
    if (!title) {
      setError('Experience title is required');
      return;
    }
    
    const expEntry = { title, StartDate: start, EndDate: end, description: desc };
    
    if (editingExpIndex !== null) {
      // Update existing
      const updated = [...experience];
      updated[editingExpIndex] = expEntry;
      setExperience(updated);
    } else {
      // Add new
      setExperience([...experience, expEntry]);
    }
    
    setShowExpModal(false);
    setNewExpTitle('');
    setNewExpStart('');
    setNewExpEnd('');
    setNewExpDesc('');
    setEditingExpIndex(null);
    setError('');
  }
  
  function removeExperience(index){
    setExperience(experience.filter((_, i) => i !== index));
  }

  // Education functions - Modal based
  function addEducation(){
    setNewEduLevel(EDUCATION_LEVELS[0]);
    setNewEduSchool('');
    setNewEduStart('');
    setNewEduEnd('');
    setEditingEduIndex(null);
    setShowEduModal(true);
  }
  
  function editEducation(index){
    const edu = education[index];
    setNewEduLevel(edu.Level || EDUCATION_LEVELS[0]);
    setNewEduSchool(edu.School || '');
    setNewEduStart(edu.StartDate || edu.startDate || edu.start || '');
    setNewEduEnd(edu.EndDate || edu.endDate || edu.end || '');
    setEditingEduIndex(index);
    setShowEduModal(true);
  }
  
  function saveEducation(){
    const level = newEduLevel;
    const school = (newEduSchool || '').trim();
    const start = (newEduStart || '').trim();
    const end = (newEduEnd || '').trim();
    
    if (!school) {
      setError('School name is required');
      return;
    }
    
    const eduEntry = { Level: level, School: school, StartDate: start, EndDate: end };
    
    if (editingEduIndex !== null) {
      // Update existing
      const updated = [...education];
      updated[editingEduIndex] = eduEntry;
      setEducation(updated);
    } else {
      // Add new
      setEducation([...education, eduEntry]);
    }
    
    setShowEduModal(false);
    setNewEduLevel(EDUCATION_LEVELS[0]);
    setNewEduSchool('');
    setNewEduStart('');
    setNewEduEnd('');
    setEditingEduIndex(null);
    setError('');
  }
  
  function removeEducation(index){
    setEducation(education.filter((_, i) => i !== index));
  }

  function checkVideoDuration(file){
    return new Promise((resolve,reject)=>{
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

  async function onVideoSelect(e){
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!f){ setVideoFile(null); return; }
    const maxSize = 50 * 1024 * 1024;
    if (f.size > maxSize){ setError('Video file is too large (max 50MB)'); setVideoFile(null); return; }
    const ok = await checkVideoDuration(f);
    if (!ok){ setError('Video must be 20 seconds or shorter'); setVideoFile(null); return; }
    setError(''); setVideoFile(f);
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

  async function submit(e){
    e.preventDefault();
    setError('');
    if (!form.firstName || !form.email) { setError('First name and email required'); return; }
    if (skills.length < 3) { setError('Please add at least 3 skills'); return; }
    setLoading(true);
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      // upload resume
      let resumeUrl = null;
      if (resumeFile && seekerId){
        // Delete old resume if exists
        if (currentResumeUrl) {
          try {
            console.log('Attempting to delete old resume:', currentResumeUrl);
            const deleteResponse = await fetch(`${API}/api/uploads/delete-resume`, {
              method: 'DELETE',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({ url: currentResumeUrl })
            });
            console.log('Delete resume response status:', deleteResponse.status);
            const deleteResult = await deleteResponse.text();
            console.log('Delete resume response:', deleteResult);
          } catch (err) {
            console.warn('Failed to delete old resume:', err);
          }
        }
        setResumeUploading(true); setResumeProgress(0);
        setResumeUploading(true); setResumeProgress(0);
        try{ const up = await uploadWithProgress(resumeFile, `${API}/api/uploads/resume`, p=>setResumeProgress(p), token); if (up?.url) { resumeUrl = up.url; setCurrentResumeUrl(up.url); setCurrentResumeName(resumeFile.name); } }
        catch(err){ setError('Resume upload failed: ' + (err?.message||err)); } finally{ setResumeUploading(false); }
      }

      // upload video
      let videoUrl = null;
      if (videoFile && seekerId){
        // Delete old video if exists
        if (currentVideoUrl) {
          try {
            console.log('Attempting to delete old video:', currentVideoUrl);
            const deleteResponse = await fetch(`${API}/api/uploads/delete-video`, {
              method: 'DELETE',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({ url: currentVideoUrl })
            });
            console.log('Delete video response status:', deleteResponse.status);
            const deleteResult = await deleteResponse.text();
            console.log('Delete video response:', deleteResult);
          } catch (err) {
            console.warn('Failed to delete old video:', err);
          }
        }
        setVideoUploading(true); setVideoProgress(0);
        setVideoUploading(true); setVideoProgress(0);
        try{ const up = await uploadWithProgress(videoFile, `${API}/api/uploads/seeker-video`, p=>setVideoProgress(p), token); if (up?.url) { videoUrl = up.url; setCurrentVideoUrl(up.url); setCurrentVideoName(videoFile.name); } }
        catch(err){ setError('Video upload failed: ' + (err?.message||err)); } finally{ setVideoUploading(false); }
      }

      // upload headshot
      let headshotUrl = null;
      if (headshotFile && seekerId){
        // Delete old headshot if exists
        if (currentHeadshotUrl) {
          try {
            console.log('Attempting to delete old headshot:', currentHeadshotUrl);
            const deleteResponse = await fetch(`${API}/api/uploads/delete-headshot`, {
              method: 'DELETE',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({ url: currentHeadshotUrl })
            });
            console.log('Delete headshot response status:', deleteResponse.status);
            const deleteResult = await deleteResponse.text();
            console.log('Delete headshot response:', deleteResult);
          } catch (err) {
            console.warn('Failed to delete old headshot:', err);
          }
        }
        setHeadshotUploading(true); setHeadshotProgress(0);
        try{ const up = await uploadWithProgress(headshotFile, `${API}/api/uploads/seeker-headshot`, p=>setHeadshotProgress(p), token); if (up?.url) { headshotUrl = up.url; setCurrentHeadshotUrl(up.url); setCurrentHeadshotName(headshotFile.name); } }
        catch(err){ setError('Headshot upload failed: ' + (err?.message||err)); } finally{ setHeadshotUploading(false); }
      }

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

      const body = { 
        FirstName: form.firstName, 
        LastName: form.lastName, 
        PhoneNumber: form.phoneNumber, 
        VisaStatus: form.visaStatus,
        PreferredSalary: combinedSalary || form.preferredSalary,
        Travel: form.travel,
        Relocate: form.relocate
      };
      
      // Add array fields
      if (skills.length) body.Skills = skills;
      if (workSetting.length) body.WorkSetting = workSetting;
      if (languages.length) body.Languages = languages;
      if (certifications.length) body.Certifications = certifications;
      if (interests.length) body.Interests = interests;
      
      // Add structured data
      if (experience.length) body.Experience = experience;
      if (education.length) body.Education = education;
      
      // Add file URLs
      if (resumeUrl) body.ResumeUrl = resumeUrl;
      if (videoUrl) body.VideoUrl = videoUrl;
      if (headshotUrl) body.HeadshotUrl = headshotUrl;

      const res = await fetch(`${API}/api/seekers/${seekerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!res.ok){ const txt = await res.text(); throw new Error(txt || `Save failed (${res.status})`); }

      router.push('/seeker/dashboard');
    }catch(err){ console.error(err); setError(err?.message || 'Save failed'); }
    finally{ setLoading(false); }
  }

  async function deleteAccount(){
    if (!confirm('Delete your account and all data? This cannot be undone.')) return;
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    try{ const res = await fetch(`${API}/api/seekers/${seekerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (res.ok){ localStorage.removeItem('fjs_token'); router.push('/'); } else { const txt = await res.text(); throw new Error(txt || 'Delete failed'); } }catch(err){ setError(err?.message || 'Delete failed'); }
    finally{ setLoading(false); }
  }

  return (
    <Layout title="Edit profile">
      <div className="d-flex justify-content-between align-items-center">
        <h2>Edit profile</h2>
        <div>
          <button className="btn btn-danger" onClick={deleteAccount} disabled={loading}>Delete account</button>
        </div>
      </div>

      <form onSubmit={submit} className="mt-3">
        <div className="row">
          <div className="col-md-6 mb-3"><label className="form-label">First name</label><input className="form-control" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} /></div>
          <div className="col-md-6 mb-3"><label className="form-label">Last name</label><input className="form-control" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} /></div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} readOnly /></div>
          <div className="col-md-6 mb-3"><label className="form-label">Phone</label><input className="form-control" value={form.phoneNumber} onChange={e=>setForm({...form, phoneNumber: e.target.value})} /></div>
        </div>

        <div className="mb-3">
          <label className="form-label">Skills (min 3, max 8)</label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={skillInput} onChange={e=>setSkillInput(e.target.value)} placeholder="Add skill and press Add" />
            <button type="button" className="btn btn-outline-secondary" onClick={addSkill}>Add</button>
          </div>
          <div>{skills.map(s=> <span key={s} className="badge bg-secondary me-1">{s} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeSkill(s)}>x</button></span>)}</div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Will you require Visa Sponsership</label>
            <select className="form-select" value={form.visaStatus || ''} onChange={e=>setForm({...form, visaStatus: e.target.value})}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="col-md-6 mb-3">
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
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Travel</label>
            <select className="form-select" value={form.travel} onChange={e=>setForm({...form, travel: e.target.value})}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Maybe">Maybe</option>
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Relocate</label>
            <select className="form-select" value={form.relocate} onChange={e=>setForm({...form, relocate: e.target.value})}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Maybe">Maybe</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Preferred Work Setting</label>
          <div className="d-flex flex-wrap gap-2">
            {['Remote','In-Office','Hybrid','On-Site'].map(o=>{
              const active = (workSetting || []).includes(o);
              return <button type="button" key={o} className={`btn btn-sm ${active? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>{ const cur=workSetting||[]; if(cur.includes(o)) setWorkSetting(cur.filter(x=>x!==o)); else setWorkSetting([...cur, o]); }}>{o}</button>
            })}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Languages</label>
          <div className="d-flex gap-2 flex-wrap mb-2">
            {['English','Mandarin','Spanish','Hindi','Arabic','Bengali','Portuguese','Russian','Japanese','Punjabi','German','Javanese','Wu','Malay','Telugu','Vietnamese','Korean','French','Turkish','Italian','Other'].map(l=>{
              const active = (languages || []).includes(l);
              return <button type="button" key={l} className={`btn btn-sm ${active? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>{
                const cur = languages || [];
                if (cur.includes(l)) setLanguages(cur.filter(x=>x!==l));
                else setLanguages([...cur, l]);
              }}>{l}</button>
            })}
          </div>
          {languages && languages.includes('Other') && <input className="form-control mt-2" placeholder="Please specify other languages" onChange={e=>setLanguages(languages.map(x=> x==='Other' ? e.target.value : x))} />}
        </div>

        <div className="mb-3">
          <label className="form-label">Work Setting Preferences</label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={workSettingInput} onChange={e=>setWorkSettingInput(e.target.value)} placeholder="Add work setting (e.g. Remote, On-site, Hybrid)" />
            <button type="button" className="btn btn-outline-secondary" onClick={addWorkSetting}>Add</button>
          </div>
          <div>{workSetting.map(s=> <span key={s} className="badge bg-secondary me-1">{s} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeWorkSetting(s)}>x</button></span>)}</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Languages</label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={languageInput} onChange={e=>setLanguageInput(e.target.value)} placeholder="Add language" />
            <button type="button" className="btn btn-outline-secondary" onClick={addLanguage}>Add</button>
          </div>
          <div>{languages.map(s=> <span key={s} className="badge bg-secondary me-1">{s} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeLanguage(s)}>x</button></span>)}</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Certifications</label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={certificationInput} onChange={e=>setCertificationInput(e.target.value)} placeholder="Add certification" />
            <button type="button" className="btn btn-outline-secondary" onClick={addCertification}>Add</button>
          </div>
          <div>{certifications.map(s=> <span key={s} className="badge bg-secondary me-1">{s} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeCertification(s)}>x</button></span>)}</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Interests</label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={interestInput} onChange={e=>setInterestInput(e.target.value)} placeholder="Add interest" />
            <button type="button" className="btn btn-outline-secondary" onClick={addInterest}>Add</button>
          </div>
          <div>{interests.map(s=> <span key={s} className="badge bg-primary me-1">{s} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeInterest(s)}>x</button></span>)}</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Work Experience</label>
          <div className="mb-2">
            <button type="button" className="btn btn-primary" onClick={addExperience}>Add Experience</button>
          </div>
          <div>
            {experience.map((exp, index) => (
              <div key={index} className="card mb-2">
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between">
                    <strong>{exp.title || 'Untitled'}</strong>
                    <div>
                      <button type="button" className="btn btn-sm btn-link" onClick={() => editExperience(index)}>Edit</button>
                      <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => removeExperience(index)}>Remove</button>
                    </div>
                  </div>
                  <div className="small text-muted">{formatDateRange(exp.StartDate || exp.startDate || exp.start, exp.EndDate || exp.endDate || exp.end)}</div>
                  <div className="mt-2" style={{whiteSpace:'pre-wrap'}}>{exp.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Education</label>
          <div className="mb-2">
            <button type="button" className="btn btn-primary" onClick={addEducation}>Add Education</button>
          </div>
          <div>
            {education.map((edu, index) => (
              <div key={index} className="card mb-2">
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between">
                    <strong>{edu.school || 'School'}</strong>
                    <div>
                      <button type="button" className="btn btn-sm btn-link" onClick={() => editEducation(index)}>Edit</button>
                      <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => removeEducation(index)}>Remove</button>
                    </div>
                  </div>
                  <div className="small text-muted">{edu.Level} {formatDateRange(edu.StartDate || edu.startDate || edu.start, edu.EndDate || edu.endDate || edu.end) ? `(${formatDateRange(edu.StartDate || edu.startDate || edu.start, edu.EndDate || edu.endDate || edu.end)})` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Upload resume (PDF)</label>
            {currentResumeName && (
              <div className="mb-2">
                <button type="button" className="btn btn-link btn-sm p-0 text-primary fw-bold" onClick={() => window.open(currentResumeUrl, '_blank')} style={{textDecoration: 'underline', cursor: 'pointer'}} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'underline'}>View</button>
              </div>
            )}
            <input type="file" accept="application/pdf" className="form-control" onChange={e=>setResumeFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            {resumeUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${resumeProgress}%`}} aria-valuenow={resumeProgress} aria-valuemin="0" aria-valuemax="100">{resumeProgress}%</div></div></div>}
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Upload 20s intro video (mp4 or mov, max 50MB)</label>
            {currentVideoName && (
              <div className="mb-2">
                <button type="button" className="btn btn-link btn-sm p-0 text-primary fw-bold" onClick={() => window.open(currentVideoUrl, '_blank')} style={{textDecoration: 'underline', cursor: 'pointer'}} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'underline'}>View</button>
              </div>
            )}
            <input type="file" accept=",.mp4,.mov,video/mp4,video/quicktime" className="form-control" onChange={onVideoSelect} />
            {videoUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${videoProgress}%`}} aria-valuenow={videoProgress} aria-valuemin="0" aria-valuemax="100">{videoProgress}%</div></div></div>}
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Upload headshot (Optional)</label>
            {currentHeadshotName && (
              <div className="mb-2">
                <button type="button" className="btn btn-link btn-sm p-0 text-primary fw-bold" onClick={() => setShowHeadshotModal(true)} style={{textDecoration: 'underline', cursor: 'pointer'}} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'underline'}>View</button>
              </div>
            )}
            <input type="file" accept="image/*" className="form-control" onChange={e=>setHeadshotFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            {headshotUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${headshotProgress}%`}} aria-valuenow={headshotProgress} aria-valuemin="0" aria-valuemax="100">{headshotProgress}%</div></div></div>}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading? 'Saving…' : 'Save'}</button>
          <Link href="/seeker/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>

      {/* Experience Modal */}
      {typeof window !== 'undefined' && showExpModal && ReactDOM.createPortal(
        <>
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}}></div>
          <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false}>
            <div className="modal-dialog modal-bottom modal-dialog-centered" role="document" style={{pointerEvents:'auto'}}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingExpIndex !== null ? 'Edit Experience' : 'Add Experience'}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={()=>{ setShowExpModal(false); setEditingExpIndex(null); setNewExpTitle(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); }}></button>
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
                  <button type="button" className="btn btn-secondary" onClick={()=>{ setShowExpModal(false); setEditingExpIndex(null); setNewExpTitle(''); setNewExpStart(''); setNewExpEnd(''); setNewExpDesc(''); }}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={saveExperience}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Education Modal */}
      {typeof window !== 'undefined' && showEduModal && ReactDOM.createPortal(
        <>
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}}></div>
          <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false}>
            <div className="modal-dialog modal-bottom modal-dialog-centered" role="document" style={{pointerEvents:'auto'}}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingEduIndex !== null ? 'Edit Education' : 'Add Education'}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={()=>{ setShowEduModal(false); setEditingEduIndex(null); setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); }}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-2"><label className="form-label small">Level</label>
                    <select className="form-control" value={newEduLevel} onChange={e=>setNewEduLevel(e.target.value)}>
                      {EDUCATION_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </div>
                  <div className="mb-2"><label className="form-label small">School/University</label><input className="form-control" value={newEduSchool} onChange={e=>setNewEduSchool(e.target.value)} placeholder="e.g. University of Example" /></div>
                  <div className="row">
                    <div className="col-6 mb-2"><label className="form-label small">Start (month)</label><input type="month" className="form-control" value={newEduStart} onChange={e=>setNewEduStart(e.target.value)} /></div>
                    <div className="col-6 mb-2"><label className="form-label small">End (month)</label><input type="month" className="form-control" value={newEduEnd} onChange={e=>setNewEduEnd(e.target.value)} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>{ setShowEduModal(false); setEditingEduIndex(null); setNewEduLevel(EDUCATION_LEVELS[0]); setNewEduSchool(''); setNewEduStart(''); setNewEduEnd(''); }}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={saveEducation}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Resume Viewer Modal */}
      {typeof window !== 'undefined' && showResumeModal && ReactDOM.createPortal(
        <>
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}} onClick={() => setShowResumeModal(false)}></div>
          <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false} onKeyDown={(e) => { if (e.key === 'Escape') setShowResumeModal(false); }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog modal-lg" role="document" style={{pointerEvents:'auto'}}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Resume - {currentResumeName}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowResumeModal(false)}></button>
                </div>
                <div className="modal-body p-0">
                  {currentResumeUrl ? (
                    <div style={{height: '600px', overflow: 'auto'}}>
                      <iframe
                        src={currentResumeUrl}
                        style={{width: '100%', height: '100%', border: 'none'}}
                        title="Resume Preview"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="text-center"><i class="fas fa-file-pdf fa-3x text-muted mb-3"></i><p class="text-muted">Unable to preview PDF. <a href="' + currentResumeUrl + '" target="_blank">Click here to open</a></p></div></div>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="d-flex justify-content-center align-items-center" style={{height: '600px'}}>
                      <div className="text-center">
                        <i className="fas fa-file-pdf fa-3x text-muted mb-3"></i>
                        <p className="text-muted">No resume uploaded</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResumeModal(false)}>Close</button>
                  <a href={currentResumeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open in New Tab</a>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Video Viewer Modal */}
      {typeof window !== 'undefined' && showVideoModal && ReactDOM.createPortal(
        <>
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}} onClick={() => setShowVideoModal(false)}></div>
          <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false} onKeyDown={(e) => { if (e.key === 'Escape') setShowVideoModal(false); }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog modal-lg" role="document" style={{pointerEvents:'auto'}}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Video - {currentVideoName}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowVideoModal(false)}></button>
                </div>
                <div className="modal-body p-0 d-flex justify-content-center align-items-center" style={{minHeight: '400px'}}>
                  {currentVideoUrl ? (
                    <video
                      controls
                      style={{width: '100%', maxHeight: '500px', objectFit: 'contain'}}
                      src={currentVideoUrl}
                      title="Video Preview"
                      preload="metadata"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div class="text-center"><i class="fas fa-video fa-3x text-muted mb-3"></i><p class="text-muted">Unable to load video. <a href="' + currentVideoUrl + '" target="_blank">Click here to open</a></p></div>';
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="text-center">
                      <i className="fas fa-video fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No video uploaded</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowVideoModal(false)}>Close</button>
                  <a href={currentVideoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open in New Tab</a>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Headshot Modal */}
      {typeof window !== 'undefined' && showHeadshotModal && ReactDOM.createPortal(
        <>
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1990}} onClick={() => setShowHeadshotModal(false)}></div>
          <div className={`modal fade show`} style={{display:'block', zIndex:2000}} tabIndex={-1} role="dialog" aria-modal={true} aria-hidden={false} onKeyDown={(e) => { if (e.key === 'Escape') setShowHeadshotModal(false); }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Headshot Preview</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowHeadshotModal(false)}></button>
                </div>
                <div className="modal-body text-center">
                  {currentHeadshotUrl ? (
                    <img 
                      src={currentHeadshotUrl} 
                      alt="Headshot" 
                      style={{maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain'}} 
                    />
                  ) : (
                    <div className="text-center">
                      <i className="fas fa-user fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No headshot uploaded</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowHeadshotModal(false)}>Close</button>
                  {currentHeadshotUrl && (
                    <a href={currentHeadshotUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open in New Tab</a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </Layout>
  )
}
