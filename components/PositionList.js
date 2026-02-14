import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Users, Search, Calendar, Share2, Sliders } from 'lucide-react';
import { API_CONFIG } from '../config/api';

export default function PositionList({ positions = [], aiName = 'AI Assistant' }){
  const [shareBusyId, setShareBusyId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  async function copyShareLink(positionId){
    if (!positionId || shareBusyId === positionId) return;
    setShareBusyId(positionId);
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      if (!token){ setToastMsg('Please sign in to share'); return; }
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/positions/share-link/${encodeURIComponent(positionId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok){ const txt = await res.text(); throw new Error(txt || 'Failed to create share link'); }
      const data = await res.json();
      const link = data?.url;
      if (!link) throw new Error('Missing link');
      try { await navigator.clipboard.writeText(link); setToastMsg('Share link copied'); }
      catch { window.prompt('Copy this link:', link); }
    }catch(err){ setToastMsg(err?.message || 'Unable to create share link'); }
    finally{
      setShareBusyId(null);
      if (typeof window !== 'undefined') setTimeout(()=>setToastMsg(''), 2500);
    }
  }

  if (!positions || positions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          borderRadius: '16px',
          border: '2px dashed #e5e7eb',
          background: 'white',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}
      >
        {/* Empty State Illustration */}
        <div 
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Search size={36} style={{ color: '#9ca3af' }} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
          No positions yet
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
          Get started by creating your first position to find qualified candidates.
        </p>
        <Link 
          href="/poster/dashboard/create-position"
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          Create Your First Position
        </Link>
      </motion.div>
    );
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {positions.map((p, index) => {
        const isOpen = (p.isOpen ?? p.IsOpen) !== undefined ? (p.isOpen ?? p.IsOpen) : true;
        const createdDate = p.createdAt || p.CreatedAt;
        const formattedDate = createdDate 
          ? new Date(createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Recently';

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            style={{
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Card Content */}
            <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
              {/* Header Row */}
              <div className="d-flex justify-content-between align-items-start mb-3 gap-3">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ 
                    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', 
                    fontWeight: '600', 
                    color: '#111827', 
                    margin: 0,
                    marginBottom: '0.5rem',
                    wordBreak: 'break-word'
                  }}>
                    {p.title}
                  </h3>
                  <div className="d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', color: '#6b7280' }}>
                    <Calendar size={14} style={{ flexShrink: 0 }} />
                    <span>Posted {formattedDate}</span>
                  </div>
                </div>
                {isOpen ? (
                  <span 
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '9999px',
                      background: '#d1fae5',
                      color: '#065f46',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    Active
                  </span>
                ) : (
                  <span 
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '9999px',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    Inactive
                  </span>
                )}
              </div>

              {/* Desktop Actions - Horizontal Layout */}
              <div className="d-none d-lg-flex gap-2 align-items-center flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm d-flex align-items-center gap-2"
                  onClick={()=>copyShareLink(p.id)}
                  disabled={shareBusyId === p.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.5rem 0.875rem',
                    background: 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    cursor: shareBusyId === p.id ? 'wait' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (shareBusyId !== p.id) {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#6E56CF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <Share2 size={14} />
                  {shareBusyId === p.id ? 'Copying…' : 'Share'}
                </button>

                <Link 
                  href={`/poster/position/${p.id}/candidates`}
                  className="btn btn-sm d-flex align-items-center gap-2"
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.5rem 0.875rem',
                    background: 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#6E56CF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <Users size={14} />
                  View Candidates
                </Link>
                
                <Link 
                  href={`/poster/dashboard/edit-position/${p.id}`}
                  className="btn btn-sm d-flex align-items-center gap-2"
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.5rem 0.875rem',
                    background: 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#6E56CF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <Edit2 size={14} />
                  Edit
                </Link>
                
                <Link 
                  href={`/poster/position/${p.id}/preferences`}
                  className="btn btn-sm d-flex align-items-center gap-1"
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.5rem 0.875rem',
                    background: 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#6E56CF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <img 
                    src="/futureofthejobsearchAI_logo.png" 
                    alt="AI" 
                    style={{ 
                      width: '14px', 
                      height: '14px', 
                      objectFit: 'contain'
                    }}
                  />
                  Teach {aiName}
                </Link>
                
                {isOpen ? (
                  <Link 
                    href={`/poster/find-candidates?positionId=${p.id}`}
                    className="btn btn-sm d-flex align-items-center gap-2 ms-auto"
                    style={{
                      background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 0.875rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Search size={14} />
                    Review Candidates
                  </Link>
                ) : (
                  <button 
                    type="button"
                    className="btn btn-sm ms-auto"
                    disabled
                    style={{
                      background: '#f3f4f6',
                      color: '#9ca3af',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 0.875rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'not-allowed'
                    }}
                  >
                    <Search size={14} />
                    Review Candidates
                  </button>
                )}
              </div>

              {/* Mobile/Tablet Actions - Stacked Layout */}
              <div className="d-lg-none">
                <div className="d-flex gap-2 mb-2">
                  <Link 
                    href={`/poster/position/${p.id}/candidates`}
                    className="btn btn-sm d-flex align-items-center justify-content-center gap-2 flex-fill"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.625rem',
                      background: 'white',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    <Users size={16} />
                    <span className="d-none d-sm-inline">View Candidates</span>
                    <span className="d-sm-none">View</span>
                  </Link>
                  
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center gap-2 flex-fill"
                    onClick={()=>copyShareLink(p.id)}
                    disabled={shareBusyId === p.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.625rem',
                      background: 'white',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    <Share2 size={16} />
                    <span>{shareBusyId === p.id ? 'Copying…' : 'Share'}</span>
                  </button>

                  <Link 
                    href={`/poster/dashboard/edit-position/${p.id}`}
                    className="btn btn-sm d-flex align-items-center justify-content-center gap-2 flex-fill"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.625rem',
                      background: 'white',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    <Edit2 size={16} />
                    <span>Edit</span>
                  </Link>
                </div>
                
                <div className="d-flex gap-2">
                  <Link 
                    href={`/poster/position/${p.id}/preferences`}
                    className="btn btn-sm d-flex align-items-center justify-content-center gap-2 flex-fill"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.625rem',
                      background: 'white',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    <img 
                      src="/futureofthejobsearchAI_logo.png" 
                      alt="AI" 
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        objectFit: 'contain'
                      }}
                    />
                    <span className="d-none d-sm-inline">Teach {aiName}</span>
                    <span className="d-sm-none">Teach AI</span>
                  </Link>
                  
                  {isOpen ? (
                    <Link 
                      href={`/poster/find-candidates?positionId=${p.id}`}
                      className="btn btn-sm d-flex align-items-center justify-content-center gap-2 flex-fill"
                      style={{
                        background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.625rem',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      <Search size={16} />
                      <span className="d-none d-sm-inline">Review Candidates</span>
                      <span className="d-sm-none">Review</span>
                    </Link>
                  ) : (
                    <button 
                      type="button"
                      className="btn btn-sm flex-fill"
                      disabled
                      style={{
                        background: '#f3f4f6',
                        color: '#9ca3af',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.625rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'not-allowed'
                      }}
                    >
                      <Search size={16} />
                      <span className="d-none d-sm-inline">Review Candidates</span>
                      <span className="d-sm-none">Review</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
    {/* Toast */}
    {!!toastMsg && (
      <div style={{
        position: 'fixed', right: 20, bottom: 20,
        background: '#111827', color: '#fff', padding: '10px 14px',
        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        fontSize: 14, zIndex: 2000
      }}>
        {toastMsg}
      </div>
    )}
  </>
  );
}
