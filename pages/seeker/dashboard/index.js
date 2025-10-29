import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Layout from '../../../components/Layout';
import InterestedPositionsList from '../../../components/InterestedPositionsList';
import { API_CONFIG } from '../../../config/api';

const API = API_CONFIG.BASE_URL;

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

  if (loading) return <Layout title="Seeker Dashboard"><div className="text-center py-5">Loading…</div></Layout>;
  if (error) return <Layout title="Seeker Dashboard"><div className="alert alert-danger mx-auto" style={{maxWidth: '600px'}}>{error}</div></Layout>;
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
        .toggle-pill {
          position: relative;
          width: 56px;
          height: 28px;
          background: #e5e7eb;
          border-radius: 28px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .toggle-pill.active {
          background: linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%);
          box-shadow: 0 0 12px rgba(110, 86, 207, 0.4);
        }
        
        .toggle-pill-button {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
        }
        
        .toggle-pill.active .toggle-pill-button {
          transform: translateX(28px);
        }
        
        .gradient-btn {
          background: linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .gradient-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(110, 86, 207, 0.3);
        }
      `}</style>
      
      <div className="mx-auto px-3 px-md-4" style={{maxWidth: '1200px'}}>
        {/* Header Section with Greeting */}
        <motion.div 
          className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-5 pb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{borderBottom: '1px solid #f3f4f6'}}
        >
          <div className="d-flex flex-column">
            <h1 className="mb-2" style={{fontSize: '2rem', fontWeight: '600', color: '#111827'}}>
              {greeting ? `${greeting}, ${displayName}` : `Welcome, ${displayName}`}
            </h1>
            <div className="d-flex align-items-center gap-3 mt-2">
              <div 
                className={`toggle-pill ${profileActive ? 'active' : ''}`}
                onClick={() => {
                  const newState = !profileActive;
                  setProfileActive(newState);
                  updateProfileActiveStatus(newState);
                }}
              >
                <div className="toggle-pill-button"></div>
              </div>
              <div className="d-flex flex-column">
                <span style={{fontSize: '14px', fontWeight: '500', color: '#374151'}}>
                  {profileActive ? 'Profile Active' : 'Profile Inactive'}
                </span>
                <span style={{fontSize: '12px', color: '#9ca3af'}}>
                  {profileActive ? 'Visible to employers' : 'Hidden from employers'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="dropdown">
            <button 
              className="btn btn-outline-secondary dropdown-toggle" 
              type="button" 
              id="accountDropdown" 
              data-bs-toggle="dropdown" 
              aria-expanded="false"
              style={{borderRadius: '8px', padding: '10px 20px'}}
            >
              Account
            </button>
            <ul className="dropdown-menu shadow-sm" aria-labelledby="accountDropdown" style={{borderRadius: '8px'}}>
              <li><span className="dropdown-item-text text-muted small">{email}</span></li>
              <li><hr className="dropdown-divider" /></li>
              <li><Link href="/seeker/edit-profile" className="dropdown-item">Edit Profile</Link></li>
              <li><button className="dropdown-item text-danger" onClick={logout}>Logout</button></li>
            </ul>
          </div>
        </motion.div>

        {/* Interested Positions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem'}}>
                Interested Positions
              </h2>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: 0}}>
                Track your job applications and connect with employers
              </p>
            </div>
            <Link href="/seeker/find-positions" className="btn btn-primary gradient-btn text-white border-0" style={{borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '500'}}>
              Find Positions
            </Link>
          </div>
          
          <InterestedPositionsList seeker={seeker} />
        </motion.div>
      </div>
    </Layout>
  )
}
