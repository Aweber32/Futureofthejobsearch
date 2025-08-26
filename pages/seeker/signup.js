import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SeekerSignup(){
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', professionalSummary: '' });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeProgress, setResumeProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  function addSkill(){
    const v = (skillInput || '').trim();
    if (!v) return;
    if (skills.length >= 8) { setError('Maximum 8 skills'); return; }
    if (skills.includes(v)) { setSkillInput(''); return; }
    setSkills([...skills, v]); setSkillInput(''); setError('');
  }

  function removeSkill(s){ setSkills(skills.filter(x=>x!==s)); }

  function validateInputs(){
    if (!form.firstName || !form.email) return 'First name and email required';
    if (skills.length < 3) return 'Please add at least 3 skills';
    if (!password || password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
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
        // disallow >20s
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
      xhr.upload.onprogress = (e)=>{
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onreadystatechange = ()=>{
        if (xhr.readyState === 4){
          try{
            const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            if (xhr.status >= 200 && xhr.status < 300) resolve(json);
            else reject(new Error(json?.message || json?.error || `Upload failed (${xhr.status})`));
          }catch(err){ reject(err); }
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
    // size limit e.g., 50MB
    const maxSize = 50 * 1024 * 1024;
    if (f.size > maxSize){ setError('Video file is too large (max 50MB)'); setVideoFile(null); return; }
    const ok = await checkVideoDuration(f);
    if (!ok){ setError('Video must be 20 seconds or shorter'); setVideoFile(null); return; }
    setError(''); setVideoFile(f);
  }

  async function submit(e){
    e.preventDefault();
    setError('');
    const vErr = validateInputs(); if (vErr){ setError(vErr); return; }
    setLoading(true);
    try{
      // register
      const res = await fetch(`${API}/api/seekers/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ FirstName: form.firstName, LastName: form.lastName, Email: form.email, PhoneNumber: form.phoneNumber, ProfessionalSummary: form.professionalSummary, Skills: skills, Password: password }) });
      const txt = await res.text(); let data = {};
      try{ data = txt ? JSON.parse(txt) : {}; } catch { data = { message: txt }; }
      if (!res.ok) throw new Error(data.error || data.message || txt || 'Registration failed');

      const seekerId = data.seekerId; const token = data.token; if (token && typeof window !== 'undefined') localStorage.setItem('fjs_token', token);

      // upload resume with progress
      if (resumeFile && seekerId){
        setResumeUploading(true); setResumeProgress(0);
        try{
          const upData = await uploadWithProgress(resumeFile, `${API}/api/uploads/resume`, p=>setResumeProgress(p), token);
          if (upData?.url) await fetch(`${API}/api/seekers/${seekerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ResumeUrl: upData.url }) });
        }catch(err){ console.error('Resume upload failed', err); setError('Resume upload failed: ' + (err.message || err)); }
        finally{ setResumeUploading(false); }
      }

      // upload video with progress
      if (videoFile && seekerId){
        setVideoUploading(true); setVideoProgress(0);
        try{
          const upData = await uploadWithProgress(videoFile, `${API}/api/uploads/seeker-video`, p=>setVideoProgress(p), token);
          if (upData?.url) await fetch(`${API}/api/seekers/${seekerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ VideoUrl: upData.url }) });
        }catch(err){ console.error('Video upload failed', err); setError('Video upload failed: ' + (err.message || err)); }
        finally{ setVideoUploading(false); }
      }

      router.push('/seeker');
    }catch(err){ console.error(err); setError(err?.message || 'Registration failed'); }
    finally{ setLoading(false); }
  }

  return (
    <Layout title="Sign up — Seeker">
      <h2>Sign up as Job Seeker</h2>
      <form onSubmit={submit} className="mt-3">
        <div className="row">
          <div className="col-md-6 mb-3"><label className="form-label">First name</label><input className="form-control" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} /></div>
          <div className="col-md-6 mb-3"><label className="form-label">Last name</label><input className="form-control" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} /></div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} /></div>
          <div className="col-md-6 mb-3"><label className="form-label">Phone</label><input className="form-control" value={form.phoneNumber} onChange={e=>setForm({...form, phoneNumber: e.target.value})} /></div>
        </div>

        <div className="mb-3"><label className="form-label">Professional summary</label><textarea className="form-control" rows={4} value={form.professionalSummary} onChange={e=>setForm({...form, professionalSummary: e.target.value})} /></div>

        <div className="mb-3">
          <label className="form-label">Skills (min 3, max 8)</label>
          <div className="d-flex gap-2 mb-2">
            <input className="form-control" value={skillInput} onChange={e=>setSkillInput(e.target.value)} placeholder="Add skill and press Add" />
            <button type="button" className="btn btn-outline-secondary" onClick={addSkill}>Add</button>
          </div>
          <div>
            {skills.map(s=> <span key={s} className="badge bg-secondary me-1">{s} <button type="button" className="btn btn-sm btn-link text-white" onClick={()=>removeSkill(s)}>x</button></span>)}
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Confirm password</label>
            <input type="password" className="form-control" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Upload resume (PDF)</label>
            <input type="file" accept="application/pdf" className="form-control" onChange={e=>setResumeFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            {resumeUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${resumeProgress}%`}} aria-valuenow={resumeProgress} aria-valuemin="0" aria-valuemax="100">{resumeProgress}%</div></div></div>}
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Upload 20s intro video (mp4 or mov, max 50MB)</label>
            <input type="file" accept=",.mp4,.mov,video/mp4,video/quicktime" className="form-control" onChange={onVideoSelect} />
            {videoUploading && <div className="mt-2"><div className="progress"><div className="progress-bar" role="progressbar" style={{width: `${videoProgress}%`}} aria-valuenow={videoProgress} aria-valuemin="0" aria-valuemax="100">{videoProgress}%</div></div></div>}
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading? 'Creating…' : 'Create account'}</button>
          <Link href="/seeker/login" className="btn btn-secondary">Back to login</Link>
        </div>
      </form>
    </Layout>
  )
}

