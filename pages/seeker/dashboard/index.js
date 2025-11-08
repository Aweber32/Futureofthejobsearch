import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../../components/Layout';
import InterestedPositionsList from '../../../components/InterestedPositionsList';
import ChatButton from '../../../components/ChatButton';
import { API_CONFIG } from '../../../config/api';
import PositionReviewModal from '../../../components/PositionReviewModal';

const API = API_CONFIG.BASE_URL;

export default function SeekerDashboard(){
  const router = useRouter();
  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState('');
  const [profileActive, setProfileActive] = useState(true);
  const [shareBusy, setShareBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [allInterests, setAllInterests] = useState([]); // all position interests for seeker
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [interestVersion, setInterestVersion] = useState(0); // bump to signal refresh to children

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

  // Fetch seeker position interests (both interested & not interested)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) return; // already redirected above
    (async () => {
      try {
        setLoadingInterests(true);
        const res = await fetch(`${API}/api/positioninterests`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load interests');
        const list = await res.json();
        setAllInterests(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn('Position interests load failed', e);
      } finally {
        setLoadingInterests(false);
      }
    })();
  }, []);

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

  async function copyShareLink() {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      if (!token) { setToastMsg('Please sign in to create a share link.'); return; }
      const res = await fetch(`${API}/api/seekers/share-link`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create share link');
      }
      const data = await res.json();
      const link = data?.url;
      if (!link) throw new Error('Missing link');
      try {
        await navigator.clipboard.writeText(link);
        setToastMsg('Share link copied to clipboard');
      } catch {
        // Fallback prompt if clipboard API not available
        window.prompt('Copy this link:', link);
      }
    } catch (err) {
      const msg = (err?.message || '').toLowerCase().includes('inactive') ? 'Activate your profile to share' : (err?.message || 'Failed to create share link');
      setToastMsg(msg);
    } finally {
      setShareBusy(false);
      // Auto-hide toast after a short delay
      if (typeof window !== 'undefined') {
        setTimeout(() => setToastMsg(''), 2500);
      }
    }
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

        .toast-lite {
          position: fixed;
          right: 20px;
          bottom: 20px;
          background: #111827;
          color: #fff;
          padding: 10px 14px;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          font-size: 14px;
          z-index: 2000;
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
          
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              type="button"
              onClick={copyShareLink}
              disabled={shareBusy || !profileActive}
              title={!profileActive ? 'Activate profile to share' : 'Copy a public share link'}
              style={{ borderRadius: '8px', padding: '10px 16px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v-3a3 3 0 0 1 3-3h3"/>
                <path d="M20 12v3a3 3 0 0 1-3 3h-3"/>
                <path d="M8 12h8"/>
                <path d="M12 8v8"/>
              </svg>
              {shareBusy ? 'Copying…' : 'Share Profile'}
            </button>

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
                <li><Link href="/seeker/analytics" className="dropdown-item">My Analytics</Link></li>
                <li><Link href="/seeker/edit-profile" className="dropdown-item">Edit Profile</Link></li>
                <li><Link href="/seeker/settings" className="dropdown-item">Settings</Link></li>
                <li><button className="dropdown-item text-danger" onClick={logout}>Logout</button></li>
              </ul>
            </div>
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
          
          <InterestedPositionsList 
            seeker={seeker} 
            version={interestVersion}
            allInterests={allInterests}
            setAllInterests={setAllInterests}
            onInterestStateChanged={()=> setInterestVersion(v=>v+1)}
          />
        </motion.div>
        {/* Un-Intrested Positions Section */}
        <UninterestedPositionsTable 
          allInterests={allInterests} 
          loadingInterests={loadingInterests} 
          setAllInterests={setAllInterests}
          onInterestStateChanged={()=> setInterestVersion(v=>v+1)}
        />
      </div>
      {!!toastMsg && (
        <div className="toast-lite" role="status" aria-live="polite">{toastMsg}</div>
      )}
    </Layout>
  )
}

// Local table component for Un-Intrested Positions
function UninterestedPositionsTable({ allInterests, loadingInterests, setAllInterests, onInterestStateChanged }) {
  const [modalPosition, setModalPosition] = useState(null);
  const [fadingIds, setFadingIds] = useState(new Set());
  const [chatMeta, setChatMeta] = useState(null); // { title, subtitle, otherUserId, positionId }
  const [employerStatuses, setEmployerStatuses] = useState({}); // positionId => 'Interested' | 'Not Interested' | 'Not Reviewed'
  const [open, setOpen] = useState(false); // mobile/collapse state
  const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  const debugCompany = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).has('debugCompany') : false;
  const notInterested = (allInterests || []).filter(pi => pi?.interested === false || pi?.Interested === false);

  const getRowKey = (pi) => (
    pi?.id ?? pi?.Id ?? pi?.positionId ?? pi?.PositionId ?? pi?.position?.id ?? pi?.Position?.Id ?? pi?.positionTitle ?? Math.random().toString(36).slice(2)
  );

  async function markAsInterested(pi) {
    if (!token) return;
    try {
      const positionId = pi.positionId || pi.PositionId || pi.position?.id || pi.Position?.Id;
      if (!positionId) return;
      const res = await fetch(`${API}/api/positioninterests`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ positionId, interested: true })
      });
      if (res.ok) {
        const rowKey = getRowKey(pi);
        setFadingIds(prev => {
          const next = new Set(prev);
          next.add(rowKey);
          return next;
        });
        // After fade-out animation, update interests so it moves out of this list
        setTimeout(() => {
          setAllInterests?.(curr => curr.map(item => {
            const key = getRowKey(item);
            return key === rowKey ? { ...item, interested: true, Interested: true } : item;
          }));
          onInterestStateChanged?.();
        }, 220);
      }
    } catch (e) {
      console.warn('Failed to re-mark as interested', e);
    }
  }

  // Fetch employer interest statuses for current seeker across all positions once
  useEffect(() => {
    if (!token) return;
    if (!notInterested.length) return;

    (async () => {
      try {
        const res = await fetch(`${API}/api/seekerinterests/mine`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const list = await res.json();
        const map = {};
        (list || []).forEach(r => {
          const pid = r.positionId ?? r.PositionId;
          const interested = (typeof r.employerInterested !== 'undefined') ? r.employerInterested : r.interested;
          if (pid != null) map[pid] = interested === true ? 'Interested' : 'Not Interested';
        });
        setEmployerStatuses(map);
      } catch (e) {
        console.warn('Failed loading employer statuses', e);
      }
    })();
  }, [token, notInterested.length]);

  if (loadingInterests) {
    return (
      <div className="mt-5 pt-4" style={{borderTop: '1px solid #f3f4f6'}}>
        <h2 style={{fontSize:'1.25rem', fontWeight:'600', color:'#111827'}} className="mb-2">Un-Intrested Positions</h2>
        <p style={{fontSize:'14px', color:'#6b7280'}} className="mb-3">Positions you previously marked as not interested. You can change your mind at any time.</p>
        <div className="text-muted">Loading positions…</div>
      </div>
    );
  }

  return (
    <div className="mt-5 pt-4" style={{borderTop: '1px solid #f3f4f6'}}>
      <div className="d-flex justify-content-center mb-3">
        <button
          className="btn btn-outline-secondary"
          style={{borderRadius:'8px', minWidth:'260px'}}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="uninterested-collapse"
        >{open ? 'Hide Not Intrested Positions' : 'Expand to see Not Intrested Postions'}</button>
      </div>
      <div id="uninterested-collapse">
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="uninterested-container"
              initial={{opacity:0, height:0}}
              animate={{opacity:1, height:'auto'}}
              exit={{opacity:0, height:0}}
              transition={{duration:0.25}}
              style={{overflow:'hidden'}}
            >
              <h2 style={{fontSize:'1.25rem', fontWeight:'600', color:'#111827'}} className="mb-2 text-center">Un-Intrested Positions</h2>
              <p style={{fontSize:'14px', color:'#6b7280'}} className="mb-3 text-center">Positions you previously marked as not interested.</p>
              {notInterested.length === 0 ? (
                <div className="text-muted mb-3 text-center">You have not marked any positions as not interested.</div>
              ) : (
                <div>
                  {/* Desktop table */}
                  <div className="d-none d-md-block table-responsive mb-3">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th style={{whiteSpace:'nowrap'}}>Title</th>
                          <th>Company</th>
                          <th style={{whiteSpace:'nowrap'}}>Marked At</th>
                          <th style={{whiteSpace:'nowrap'}}>Employer Intrest</th>
                          <th style={{whiteSpace:'nowrap'}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence initial={false}>
                          {notInterested.map(pi => {
                            const pos = pi.position || pi.Position || {};
                            const title = pos?.title || pos?.Title || pi?.positionTitle || 'Position Conversation';
                            const companyCandidates = [
                              // position-level common shapes
                              pos?.companyName,
                              pos?.CompanyName,
                              pos?.company,
                              pos?.company?.name,
                              pos?.company?.companyName,
                              pos?.Company?.Name,
                              pos?.Company?.CompanyName,
                              // employer navigation (camel & Pascal)
                              pos?.employer?.companyName,
                              pos?.employer?.CompanyName,
                              pos?.employer?.name,
                              pos?.Employer?.CompanyName,
                              pos?.Employer?.Name,
                              // values from the interest payload itself (camel & Pascal)
                              pi?.position?.companyName,
                              pi?.position?.CompanyName,
                              pi?.position?.employer?.companyName,
                              pi?.position?.employer?.CompanyName,
                              pi?.position?.employer?.name,
                              pi?.Position?.CompanyName,
                              pi?.Position?.Employer?.CompanyName,
                              pi?.Position?.Employer?.Name,
                              pi?.companyName,
                              pi?.CompanyName,
                              pi?.company,
                              pi?.employer?.companyName,
                              pi?.employer?.CompanyName,
                              pi?.employer?.name,
                              pi?.Employer?.CompanyName,
                              pi?.Employer?.Name
                            ];
                              const companyFound = companyCandidates.find(v => v && typeof v === 'string' && v.trim().length > 0);
                              if (debugCompany) {
                                try { console.log('[NI company debug] desktop row', { rowKey, title, companyCandidates, pos, pi }); } catch {}
                              }
                            const company = companyFound ? companyFound.trim() : 'Unknown company';
                            const reviewedAt = pi.reviewedAt || pi.ReviewedAt || null;
                            const reviewedDisplay = reviewedAt ? new Date(reviewedAt).toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'}) : '—';
                            const rowKey = getRowKey(pi);
                            const employerUserId = (
                              pos?.employer?.userId ||
                              pos?.employer?.UserId ||
                              pi?.employer?.userId ||
                              pi?.employer?.UserId ||
                              pi?.posterUserId ||
                              null
                            );
                            if (fadingIds.has(rowKey)) return null;
                            return (
                              <motion.tr
                                key={rowKey+':ni'}
                                initial={{ opacity: 0, y: -2 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: 'table-row' }}
                              >
                                <td>{title}</td>
                                <td>{company}</td>
                                <td style={{fontSize:'12px', color:'#6b7280'}}>{reviewedDisplay}</td>
                                {(() => {
                                  const pid = pi.positionId || pi.PositionId || pos?.id || pos?.Id;
                                  const status = employerStatuses[pid] || 'Not Reviewed';
                                  const lower = status.toLowerCase();
                                  let badgeClass = 'bg-secondary bg-opacity-10 text-secondary';
                                  let display = 'Not Reviewed';
                                  if (lower.includes('not interested')) { badgeClass = 'bg-danger bg-opacity-10 text-danger'; display = 'Not Interested'; }
                                  else if (lower.includes('interested')) { badgeClass = 'bg-success bg-opacity-10 text-success'; display = 'Interested'; }
                                  return (
                                    <td>
                                      <span className={`badge ${badgeClass}`}
                                        style={{borderRadius:'9999px', padding:'0.375rem 0.65rem', fontSize:'11px', fontWeight:500}}>
                                        {display}
                                      </span>
                                    </td>
                                  );
                                })()}
                                <td className="d-flex flex-wrap gap-2">
                                  <button className="btn btn-sm btn-outline-primary" style={{borderRadius:'6px'}} onClick={async () => {
                                    try {
                                      const pid = pos?.id || pos?.Id || pi?.positionId || pi?.PositionId;
                                      if (!pid) { setModalPosition(pos); return; }
                                      // If collections already present, use existing object
                                      const hasCollections = Array.isArray(pos?.educations) || Array.isArray(pos?.Educations) || Array.isArray(pos?.experiences) || Array.isArray(pos?.Experiences) || Array.isArray(pos?.skillsList) || Array.isArray(pos?.SkillsList);
                                      if (hasCollections) { setModalPosition(pos); return; }
                                      if (!token) { setModalPosition(pos); return; }
                                      const res = await fetch(`${API}/api/positions/${pid}`, { headers: { Authorization: `Bearer ${token}` } });
                                      if (res.ok) {
                                        const full = await res.json();
                                        setModalPosition(full);
                                      } else {
                                        setModalPosition(pos);
                                      }
                                    } catch { setModalPosition(pos); }
                                  }}>View</button>
                                  <button className="btn btn-sm btn-success" style={{borderRadius:'6px'}} onClick={() => markAsInterested(pi)}>Mark as Intrested</button>
                                  <ChatButton title={title} subtitle={company} otherUserId={employerUserId} positionId={pos?.id || pos?.Id || pi?.positionId || pi?.PositionId} unreadCount={0} />
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile card list */}
                  <div className="d-md-none d-flex flex-column gap-3">
                    <AnimatePresence initial={false}>
                      {notInterested.map(pi => {
                        const pos = pi.position || pi.Position || {};
                        const title = pos?.title || pos?.Title || pi?.positionTitle || 'Position Conversation';
                        const companyCandidates = [
                          // position-level common shapes
                          pos?.companyName,
                          pos?.CompanyName,
                          pos?.company,
                          pos?.company?.name,
                          pos?.company?.companyName,
                          pos?.Company?.Name,
                          pos?.Company?.CompanyName,
                          // employer navigation (camel & Pascal)
                          pos?.employer?.companyName,
                          pos?.employer?.CompanyName,
                          pos?.employer?.name,
                          pos?.Employer?.CompanyName,
                          pos?.Employer?.Name,
                          // values from the interest payload itself (camel & Pascal)
                          pi?.position?.companyName,
                          pi?.position?.CompanyName,
                          pi?.position?.employer?.companyName,
                          pi?.position?.employer?.CompanyName,
                          pi?.position?.employer?.name,
                          pi?.Position?.CompanyName,
                          pi?.Position?.Employer?.CompanyName,
                          pi?.Position?.Employer?.Name,
                          pi?.companyName,
                          pi?.CompanyName,
                          pi?.company,
                          pi?.employer?.companyName,
                          pi?.employer?.CompanyName,
                          pi?.employer?.name,
                          pi?.Employer?.CompanyName,
                          pi?.Employer?.Name
                        ];
                        const companyFound = companyCandidates.find(v => v && typeof v === 'string' && v.trim().length > 0);
                        if (debugCompany) {
                          try { console.log('[NI company debug] mobile card', { rowKey, title, companyCandidates, pos, pi }); } catch {}
                        }
                        const company = companyFound ? companyFound.trim() : 'Unknown company';
                        const reviewedAt = pi.reviewedAt || pi.ReviewedAt || null;
                        const reviewedDisplay = reviewedAt ? new Date(reviewedAt).toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'}) : '—';
                        const rowKey = getRowKey(pi);
                        const employerUserId = (
                          pos?.employer?.userId ||
                          pos?.employer?.UserId ||
                          pi?.employer?.userId ||
                          pi?.employer?.UserId ||
                          pi?.posterUserId ||
                          null
                        );
                        if (fadingIds.has(rowKey)) return null;
                        const pid = pi.positionId || pi.PositionId || pos?.id || pos?.Id;
                        const status = employerStatuses[pid] || 'Not Reviewed';
                        const lower = status.toLowerCase();
                        let badgeClass = 'bg-secondary bg-opacity-10 text-secondary';
                        let display = 'Not Reviewed';
                        if (lower.includes('not interested')) { badgeClass = 'bg-danger bg-opacity-10 text-danger'; display = 'Not Interested'; }
                        else if (lower.includes('interested')) { badgeClass = 'bg-success bg-opacity-10 text-success'; display = 'Interested'; }
                        return (
                          <motion.div
                            key={rowKey+':ni-mobile'}
                            initial={{opacity:0, y: -4}}
                            animate={{opacity:1, y:0}}
                            exit={{opacity:0, y:-6}}
                            transition={{duration:0.2}}
                            className="card shadow-sm border-0"
                            style={{borderRadius:'12px'}}
                          >
                            <div className="card-body d-flex flex-column gap-2">
                              <div className="d-flex justify-content-between align-items-start gap-2">
                                <div>
                                  <h6 style={{fontWeight:600, marginBottom:'4px'}}>{title}</h6>
                                  <div style={{fontSize:'12px', color:'#6b7280'}}>{company}</div>
                                </div>
                                <span className={`badge ${badgeClass}`} style={{borderRadius:'9999px', padding:'0.375rem 0.65rem', fontSize:'10px', fontWeight:500}}>{display}</span>
                              </div>
                              <div style={{fontSize:'11px', color:'#6b7280'}}>Marked: {reviewedDisplay}</div>
                              <div className="d-flex flex-wrap gap-2 mt-1">
                                <button className="btn btn-sm btn-outline-primary" style={{borderRadius:'6px'}} onClick={async () => {
                                  try {
                                    const pid = pos?.id || pos?.Id || pi?.positionId || pi?.PositionId;
                                    if (!pid) { setModalPosition(pos); return; }
                                    const hasCollections = Array.isArray(pos?.educations) || Array.isArray(pos?.Educations) || Array.isArray(pos?.experiences) || Array.isArray(pos?.Experiences) || Array.isArray(pos?.skillsList) || Array.isArray(pos?.SkillsList);
                                    if (hasCollections) { setModalPosition(pos); return; }
                                    if (!token) { setModalPosition(pos); return; }
                                    const res = await fetch(`${API}/api/positions/${pid}`, { headers: { Authorization: `Bearer ${token}` } });
                                    if (res.ok) {
                                      const full = await res.json();
                                      setModalPosition(full);
                                    } else { setModalPosition(pos); }
                                  } catch { setModalPosition(pos); }
                                }}>View</button>
                                <button className="btn btn-sm btn-success" style={{borderRadius:'6px'}} onClick={() => markAsInterested(pi)}>Mark as Intrested</button>
                                <ChatButton title={title} subtitle={company} otherUserId={employerUserId} positionId={pos?.id || pos?.Id || pi?.positionId || pi?.PositionId} unreadCount={0} />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {modalPosition && (
        <PositionReviewModal
          position={modalPosition}
          onClose={() => setModalPosition(null)}
          onInterested={(position)=>{
            const pid = position?.id ?? position?.Id ?? position?.positionId ?? position?.PositionId;
            setAllInterests(curr => curr.map(ci => {
              const ciPid = ci.positionId ?? ci.PositionId ?? ci.position?.id ?? ci.Position?.Id;
              return String(ciPid) === String(pid) ? { ...ci, interested:true, Interested:true } : ci;
            }));
            onInterestStateChanged?.();
            setModalPosition(null);
          }}
          onNotInterested={()=>{}}
        />
      )}
    </div>
  );
}
