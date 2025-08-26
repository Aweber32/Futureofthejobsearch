import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import SeekerCard from '../../../components/SeekerCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SeekerDashboard(){
  const router = useRouter();
  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(()=>{
    // compute a friendly greeting based on local time
    try{
      const now = new Date();
      const h = now.getHours();
      const g = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
      setGreeting(g);
    }catch{}
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { router.push('/seeker/login'); return; }
    (async ()=>{
      try{
        const res = await fetch(`${API}/api/seekers/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        // API returns { user, seeker }
        setSeeker(data.seeker ?? data);
      }catch(err){ setError(err?.message || 'Failed to load'); }
      finally{ setLoading(false); }
    })();
  },[]);

  async function logout(){
    const token = localStorage.getItem('fjs_token');
    try{
      await fetch(`${API}/api/seekers/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    }catch{}
    localStorage.removeItem('fjs_token');
    router.push('/seeker/login');
  }

  if (loading) return <Layout title="Seeker Dashboard"><div>Loading…</div></Layout>;
  if (error) return <Layout title="Seeker Dashboard"><div className="alert alert-danger">{error}</div></Layout>;
  if (!seeker) return <Layout title="Seeker Dashboard"><div>No seeker data found.</div></Layout>;

  // tolerate different JSON naming: camelCase or PascalCase
  const firstName = seeker?.firstName ?? seeker?.FirstName ?? seeker?.first_name ?? seeker?.givenName ?? seeker?.user?.firstName ?? seeker?.user?.name ?? '';
  const lastName = seeker?.lastName ?? seeker?.LastName ?? seeker?.last_name ?? '';
  const email = seeker?.email ?? seeker?.Email ?? seeker?.user?.email ?? seeker?.user?.Email ?? '';
  const displayName = firstName || (email ? email.split('@')[0] : '') || seeker?.user?.name || 'Seeker';
  const rawSkills = seeker?.skills ?? seeker?.Skills ?? '';
  const skills = rawSkills ? rawSkills.split(',').map(s=>s.trim()).filter(Boolean) : [];

  return (
    <Layout title="Seeker Dashboard">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1>{greeting ? `${greeting}, ${displayName}` : `Welcome, ${displayName}`}</h1>
          <SeekerCard seeker={seeker} />
        </div>
        <div className="d-flex gap-2">
          <Link href="/seeker/edit-profile" className="btn btn-outline-secondary">Edit profile</Link>
          <button className="btn btn-outline-danger" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h4>Interested positions</h4>
        <Link href="/seeker/find-positions" className="btn btn-primary">Find Positions</Link>
      </div>

      <div>
        <div className="card mb-3">
          <div className="card-body">
            {seeker.professionalSummary && <p>{seeker.professionalSummary}</p>}
            <h5>Skills</h5>
            {skills.length ? <ul>{skills.map(s=> <li key={s}>{s}</li>)}</ul> : <p>No skills listed.</p>}
            <h5>Resume & Video</h5>
            <ul>
              {seeker.resumeUrl && <li><a href={seeker.resumeUrl} target="_blank" rel="noreferrer">View resume</a></li>}
              {seeker.videoUrl && <li><a href={seeker.videoUrl} target="_blank" rel="noreferrer">View video</a></li>}
            </ul>
          </div>
        </div>
      </div>

    </Layout>
  )
}
