import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import InterestedPositionsList from '../../../components/InterestedPositionsList';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SeekerDashboard(){
  const router = useRouter();
  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState('');
  const [profileActive, setProfileActive] = useState(true);

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
        setSeeker({ ...data.seeker, user: data.user });
        // Set profile active status from database (default to true if not set)
        setProfileActive(data.seeker?.isProfileActive ?? data.seeker?.IsProfileActive ?? true);
      }catch(err){ setError(err?.message || 'Failed to load'); }
      finally{ setLoading(false); }
    })();
  },[]);

  async function updateProfileActiveStatus(isActive) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token || !seeker?.id) return;
    
    try {
      const res = await fetch(`${API}/api/seekers/${seeker.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ IsProfileActive: isActive })
      });
      
      if (!res.ok) {
        console.error('Failed to update profile active status');
        // Revert the toggle if the update failed
        setProfileActive(!isActive);
      }
    } catch (err) {
      console.error('Error updating profile active status:', err);
      // Revert the toggle if the update failed
      setProfileActive(!isActive);
    }
  }

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
  const email = seeker?.user?.email ?? seeker?.email ?? seeker?.Email ?? '';
  const displayName = firstName || (email ? email.split('@')[0] : '') || seeker?.user?.name || 'Seeker';
  const rawSkills = seeker?.skills ?? seeker?.Skills ?? '';
  const skills = rawSkills ? rawSkills.split(',').map(s=>s.trim()).filter(Boolean) : [];

  return (
    <Layout title="Seeker Dashboard">
      <style jsx>{`
        .toggle-container {
          display: flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        
        .toggle-slider {
          position: relative;
          width: 50px;
          height: 24px;
          background: #ccc;
          border-radius: 24px;
          transition: background-color 0.3s ease;
        }
        
        .toggle-slider.active {
          background: #28a745;
        }
        
        .toggle-button {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.3s ease;
        }
        
        .toggle-slider.active .toggle-button {
          transform: translateX(26px);
        }
      `}</style>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1>{greeting ? `${greeting}, ${displayName}` : `Welcome, ${displayName}`}</h1>
          <div className="mt-2 d-flex align-items-center">
            <span className="me-3 fw-bold" style={{fontFamily: 'Arial, sans-serif', fontSize: '14px'}}>Profile Active:</span>
            <div className="toggle-container" onClick={() => {
              const newState = !profileActive;
              setProfileActive(newState);
              updateProfileActiveStatus(newState);
            }}>
              <div className={`toggle-slider ${profileActive ? 'active' : ''}`}>
                <div className="toggle-button"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="dropdown">
          <button className="btn btn-outline-secondary dropdown-toggle" type="button" id="accountDropdown" data-bs-toggle="dropdown" aria-expanded="false">
            Account
          </button>
          <ul className="dropdown-menu" aria-labelledby="accountDropdown">
            <li><span className="dropdown-item-text text-muted small">{email}</span></li>
            <li><hr className="dropdown-divider" /></li>
            <li><Link href="/seeker/edit-profile" className="dropdown-item">Edit Profile</Link></li>
            <li><button className="dropdown-item text-danger" onClick={logout}>Logout</button></li>
          </ul>
        </div>
      </div>

      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h4>Interested positions</h4>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={() => console.log('Preview Profile clicked')}
          >
            Preview Profile
          </button>
          <Link href="/seeker/find-positions" className="btn btn-primary">Find Positions</Link>
        </div>
      </div>
      <div>
        {/* Interested positions list */}
        <div className="card">
          <div className="card-body">
            <InterestedPositionsList seeker={seeker} />
          </div>
        </div>
      </div>

    </Layout>
  )
}
