import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Plus, Briefcase, Users, Clock, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../../components/Layout';
import PositionList from '../../../components/PositionList';
import AINameModal from '../../../components/AINameModal';
import { API_CONFIG } from '../../../config/api';
import { signBlobUrl } from '../../../utils/blobHelpers';

const API = API_CONFIG.BASE_URL;

export default function Dashboard(){
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [positions, setPositions] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiName, setAiName] = useState('AI Assistant');

  useEffect(()=>{
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { router.push('/poster/login'); return; }

    // Check if AI assistant exists
    (async ()=>{
      try{
        const aiResponse = await fetch(`${API}/api/AIAssistant`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (aiResponse.status === 404) {
          // AI doesn't exist, show modal after a short delay
          setTimeout(() => setShowAIModal(true), 500);
        } else if (aiResponse.ok) {
          // AI exists, fetch and store the name
          const aiData = await aiResponse.json();
          setAiName(aiData.name || 'AI Assistant');
        }
      } catch (err) {
        console.error('Error checking AI assistant:', err);
      }
    })();

    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>r.ok? r.json() : Promise.reject('Unauthorized'))
      .then(async data=>{
        // Store user email for dropdown
        setUserEmail(data.user?.email || '');
        
        if (!data.employer) { setCompany(null); setPositions([]); setLoading(false); return; }
        const emp = data.employer;
        let logo = emp.logoUrl;
        // Sign the logo URL if it's a path-only reference
        if (logo) {
          logo = await signBlobUrl(logo, token);
        }

        setCompany({ 
          name: emp.companyName, 
          logo, 
          description: emp.companyDescription,
          id: emp.id
        });
        
        // fetch positions for this employer and set into state
        try {
          const posRes = await fetch(`${API}/api/positions`, { headers: { Authorization: `Bearer ${token}` } });
          if (posRes.ok){
            const all = await posRes.json();
            // filter positions that belong to this employer
            const myPositions = all.filter(p => p.employerId === emp.id || (p.employer && p.employer.id === emp.id));
            setPositions(myPositions);
          } else {
            setPositions([]);
          }
        } catch (e) {
          console.warn('Failed to fetch positions', e);
          setPositions([]);
        }
        setLoading(false);
      })
      .catch(()=>router.push('/poster/login'));
  },[]);

  function handleAICreated(aiData) {
    console.log('AI Assistant created:', aiData);
    setAiName(aiData.name || 'AI Assistant');
    setShowAIModal(false);
  }

  async function logout(){
    const token = localStorage.getItem('fjs_token');
    try{
      await fetch(`${API}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    }catch{}
    localStorage.removeItem('fjs_token');
    router.push('/poster/login');
  }

  const activePositions = positions.filter(p => (p.isOpen ?? p.IsOpen) !== false);
  const draftPositions = positions.filter(p => (p.isOpen ?? p.IsOpen) === false);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div style={{ color: '#6b7280' }}>Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <AINameModal show={showAIModal} onAICreated={handleAICreated} />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4 mb-md-5">
            <div className="d-flex align-items-start gap-3 w-100">
              {/* Company Avatar */}
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  background: company?.logo 
                    ? `url(${company.logo}) center/cover` 
                    : 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(110, 86, 207, 0.15)',
                  border: '3px solid white',
                  flexShrink: 0
                }}
                className="d-none d-sm-flex"
              >
                {!company?.logo && (company?.name?.[0] || 'C')}
              </div>
              
              {/* Company Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ 
                  fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '0.5rem', 
                  lineHeight: '1.2',
                  wordBreak: 'break-word'
                }}>
                  {company?.name || 'Your Company'}
                </h1>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '1rem', 
                  fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', 
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {company?.description || 'Building the future of work'}
                </p>
                
                {/* Stats Row */}
                <div className="d-flex flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(110, 86, 207, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Briefcase size={16} style={{ color: '#6E56CF' }} />
                    </div>
                    <span style={{ fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', color: '#374151', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#111827' }}>{activePositions.length}</strong> active {activePositions.length === 1 ? 'role' : 'roles'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Account Dropdown */}
            <div className="dropdown" style={{ width: '100%', maxWidth: '300px' }}>
              <button 
                className="btn d-flex align-items-center justify-content-between w-100" 
                type="button" 
                id="accountDropdown" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
                aria-label="Account menu"
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '0.625rem 1rem',
                  background: 'white',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6E56CF';
                  e.currentTarget.style.background = '#fafafa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = 'white';
                }}
              >
                <span>Account</span>
                <ChevronDown size={16} />
              </button>
              <ul className="dropdown-menu dropdown-menu-end w-100" aria-labelledby="accountDropdown" style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <li><span className="dropdown-item-text text-muted small" style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>{userEmail}</span></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link href="/poster/edit-ai" className="dropdown-item">Edit {aiName} (AI Assistant)</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link href="/poster/dashboard/analytics" className="dropdown-item">Analytics</Link></li>
                <li><Link href="/poster/dashboard/edit-company" className="dropdown-item">Edit Company</Link></li>
                <li><Link href="/poster/dashboard/settings" className="dropdown-item">Settings</Link></li>
                <li><Link href="/poster/dashboard/billing" className="dropdown-item">Billing</Link></li>
                <li><button className="dropdown-item text-danger" onClick={logout}>Logout</button></li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="row g-3 g-md-4">
          {/* Left Column - Posted Positions */}
          <div className="col-12 col-lg-8 order-2 order-lg-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h2 style={{ 
                fontSize: 'clamp(1.125rem, 3vw, 1.25rem)', 
                fontWeight: '600', 
                color: '#111827', 
                marginBottom: '1rem' 
              }}>
                Posted Positions
              </h2>
              <PositionList positions={positions} aiName={aiName} />
            </motion.div>
          </div>

          {/* Right Column - Create Position Card */}
          <div className="col-12 col-lg-4 order-1 order-lg-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ position: 'sticky', top: '1rem' }}
              className="mb-3 mb-lg-0"
            >
              <div 
                style={{
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
              >
                {/* Purple header band */}
                <div style={{
                  background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                  padding: 'clamp(1rem, 3vw, 1.5rem)',
                  color: 'white'
                }}>
                  <div className="d-flex align-items-center gap-2 gap-sm-3 mb-2">
                    <div 
                      style={{
                        width: 'clamp(40px, 10vw, 48px)',
                        height: 'clamp(40px, 10vw, 48px)',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Plus size={window.innerWidth < 640 ? 20 : 24} style={{ color: 'white' }} />
                    </div>
                    <h3 style={{ 
                      fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                      fontWeight: '600', 
                      margin: 0, 
                      lineHeight: '1.3' 
                    }}>
                      Create New Position
                    </h3>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', 
                    opacity: 0.95, 
                    lineHeight: '1.5' 
                  }}>
                    Post a new role and start finding qualified candidates
                  </p>
                </div>

                {/* White content area */}
                <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
                  <Link 
                    href="/poster/dashboard/create-position" 
                    className="btn w-100 d-flex align-items-center justify-content-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: 'clamp(0.625rem, 2vw, 0.75rem) 1rem',
                      fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(110, 86, 207, 0.25)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(110, 86, 207, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(110, 86, 207, 0.25)';
                    }}
                  >
                    <Plus size={18} />
                    Create Position
                  </Link>
                  
                  {/* Tips Checklist */}
                  <div style={{ 
                    marginTop: 'clamp(1rem, 3vw, 1.5rem)', 
                    paddingTop: 'clamp(1rem, 3vw, 1.5rem)', 
                    borderTop: '1px solid #f3f4f6' 
                  }}>
                    <h4 style={{ 
                      fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', 
                      fontWeight: '600', 
                      color: '#6b7280', 
                      marginBottom: '0.875rem', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em' 
                    }}>
                      Best Practices
                    </h4>
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: 0, 
                      fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', 
                      color: '#6b7280' 
                    }}>
                      <li style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'start', gap: '0.625rem' }}>
                        <span style={{ 
                          color: '#6E56CF', 
                          fontWeight: '700',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: 'rgba(110, 86, 207, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>✓</span>
                        <span style={{ lineHeight: '1.5' }}>Write clear, detailed job descriptions</span>
                      </li>
                      <li style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'start', gap: '0.625rem' }}>
                        <span style={{ 
                          color: '#6E56CF', 
                          fontWeight: '700',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: 'rgba(110, 86, 207, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>✓</span>
                        <span style={{ lineHeight: '1.5' }}>List specific skills and requirements</span>
                      </li>
                      <li style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'start', gap: '0.625rem' }}>
                        <span style={{ 
                          color: '#6E56CF', 
                          fontWeight: '700',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: 'rgba(110, 86, 207, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>✓</span>
                        <span style={{ lineHeight: '1.5' }}>Review candidates within 24-48 hours</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'start', gap: '0.625rem' }}>
                        <span style={{ 
                          color: '#6E56CF', 
                          fontWeight: '700',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: 'rgba(110, 86, 207, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>✓</span>
                        <span style={{ lineHeight: '1.5' }}>Keep your company profile updated</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
