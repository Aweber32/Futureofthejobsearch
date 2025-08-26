import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function EditProfile(){
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', professionalSummary: '' });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [resumeProgress, setResumeProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seekerId, setSeekerId] = useState(null);

  useEffect(()=>{
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { router.push('/seeker/login'); return; }
    (async ()=>{
      try{
        const res = await fetch(`${API}/api/seekers/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        const s = data.seeker ?? data;
        setSeekerId(s?.id ?? s?.Id ?? null);
        setForm({ firstName: s?.firstName ?? s?.FirstName ?? '', lastName: s?.lastName ?? s?.LastName ?? '', email: data.user?.email ?? '', phoneNumber: s?.phoneNumber ?? s?.PhoneNumber ?? '', professionalSummary: s?.professionalSummary ?? s?.ProfessionalSummary ?? '' });
        const rawSkills = s?.skills ?? s?.Skills ?? '';
        setSkills(rawSkills ? (Array.isArray(rawSkills) ? rawSkills : String(rawSkills).split(',').map(x=>x.trim()).filter(Boolean)) : []);
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
      if (resumeFile && seekerId){ setResumeUploading(true); setResumeProgress(0); try{ const up = await uploadWithProgress(resumeFile, `${API}/api/uploads/resume`, p=>setResumeProgress(p), token); if (up?.url) resumeUrl = up.url; }catch(err){ setError('Resume upload failed: ' + (err?.message||err)); } finally{ setResumeUploading(false); } }

      // upload video
      let videoUrl = null;
      if (videoFile && seekerId){ setVideoUploading(true); setVideoProgress(0); try{ const up = await uploadWithProgress(videoFile, `${API}/api/uploads/seeker-video`, p=>setVideoProgress(p), token); if (up?.url) videoUrl = up.url; }catch(err){ setError('Video upload failed: ' + (err?.message||err)); } finally{ setVideoUploading(false); } }

      const body = { FirstName: form.firstName, LastName: form.lastName, PhoneNumber: form.phoneNumber, ProfessionalSummary: form.professionalSummary };
      if (skills.length) body.Skills = skills;
      if (resumeUrl) body.ResumeUrl = resumeUrl;
      if (videoUrl) body.VideoUrl = videoUrl;

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

        <div className="mb-3"><label className="form-label">Professional summary</label><textarea className="form-control" rows={4} value={form.professionalSummary} onChange={e=>setForm({...form, professionalSummary: e.target.value})} /></div>

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
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading? 'Saving…' : 'Save'}</button>
          <Link href="/seeker/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>
    </Layout>
  )
}
