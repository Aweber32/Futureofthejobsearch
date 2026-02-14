import Layout from '../../components/Layout';
import CandidateSwiper from '../../components/CandidateSwiper';
import AILoadingScreen from '../../components/AILoadingScreen';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { API_CONFIG } from '../../config/api';

export default function FindCandidates(){
  const router = useRouter();
  const [candidates, setCandidates] = useState(null);
  const [positionId, setPositionId] = useState(null);
  const [aiName, setAiName] = useState('AI Assistant');
  const [allReviewed, setAllReviewed] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('initial'); // 'initial' | 'shrinking' | 'moving' | 'newBubble'

  // Capture positionId from URL then clean it
  useEffect(() => {
    if (router.isReady && router.query.positionId) {
      const pid = router.query.positionId;
      setPositionId(pid); // Store it in state
      router.replace('/poster/find-candidates', undefined, { shallow: true }); // Clean URL
    }
  }, [router.isReady, router.query.positionId]);

  useEffect(()=>{
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Fetch AI assistant name
        if (token) {
          try {
            const aiResponse = await fetch(`${base}/api/AIAssistant`, { headers });
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              if (!cancelled) setAiName(aiData.name || 'AI Assistant');
            }
          } catch (e) { /* ignore */ }
        }
        
        // fetch seekers with optional positionId for filtering
        const seekersUrl = positionId 
          ? `${base}/api/seekers?positionId=${positionId}`
          : `${base}/api/seekers`;
        const res = await fetch(seekersUrl, { headers });
        if (!res.ok) throw new Error('no seekers');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.seekers || data);
        // Filter out seekers with inactive profiles
        const activeSeekers = Array.isArray(list) ? list.filter(seeker => seeker.isProfileActive !== false) : [];

        // fetch existing interest reviews and merge
        try{
          const r2 = await fetch(`${base}/api/seekerinterests`, { headers });
          if (r2.ok){
            const interests = await r2.json();
            const map = new Map();
            (interests||[]).forEach(i => map.set(i.seekerId ?? i.SeekerId ?? i.Seeker?.id ?? i.Seeker?.Id, i));
            const merged = (activeSeekers||[]).map(s => ({ ...s, _interest: map.get(s.id ?? s.Id) || null }));
            if (!cancelled) setCandidates(merged);
            return;
          }
        }catch(e){ /* ignore */ }

        if (!cancelled) setCandidates(Array.isArray(activeSeekers) ? activeSeekers : []);
      }catch(e){ /* ignore - CandidateSwiper will show empty */ }
    }
    load();
    return ()=>{ cancelled = true }
  },[positionId]); // Re-fetch if positionId changes

  // Animation sequence when all candidates reviewed
  useEffect(() => {
    if (allReviewed) {
      // Phase 1: Shrink bubble into logo
      setAnimationPhase('shrinking');
      setTimeout(() => {
        // Phase 2: Show new bubble
        setAnimationPhase('newBubble');
      }, 600); // Wait for shrink animation
    }
  }, [allReviewed]);

  const handleAllReviewed = () => {
    setAllReviewed(true);
  };

  return (
    <Layout title="Find candidates">
      <div className="alert alert-info mb-3" role="alert">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Beta:</strong> Will show already reviewed profiles for testing purposes
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">Candidate review</h2>
        <div>
          <a href="/poster/dashboard" className="btn btn-outline-secondary btn-sm">Return</a>
        </div>
      </div>

      {/* AI Assistant Speech Bubble - Initial State */}
      {candidates !== null && !allReviewed && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
          <img 
            src="/futureofthejobsearchAI_logo.png" 
            alt="AI" 
            style={{ 
              width: '48px', 
              height: '48px', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(110, 86, 207, 0.3))',
              flexShrink: 0
            }}
          />
          <div style={{ position: 'relative', flex: 1 }}>
            <div 
              style={{
                background: 'white',
                border: '2px solid #6E56CF',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(110, 86, 207, 0.15)'
              }}
            >
              {/* Speech bubble arrow */}
              <div 
                style={{
                  position: 'absolute',
                  left: '-10px',
                  top: '16px',
                  width: 0,
                  height: 0,
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  borderRight: '10px solid #6E56CF'
                }}
              />
              <div 
                style={{
                  position: 'absolute',
                  left: '-7px',
                  top: '17px',
                  width: 0,
                  height: 0,
                  borderTop: '9px solid transparent',
                  borderBottom: '9px solid transparent',
                  borderRight: '9px solid white'
                }}
              />
              
              <p style={{ margin: 0, fontSize: '0.9375rem', color: '#374151', lineHeight: '1.6' }}>
                Hello! I found <strong style={{ color: '#6E56CF' }}>{candidates.length}</strong> {candidates.length === 1 ? 'candidate' : 'candidates'} that I think relate to you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Animated AI State - When all reviewed */}
      {allReviewed && (
        <div style={{ 
          display: 'flex',
          alignItems: 'flex-start',
          marginTop: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', width: '100%' }}>
            <img 
              src="/futureofthejobsearchAI_logo.png" 
              alt="AI" 
              style={{ 
                width: '48px', 
                height: '48px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(110, 86, 207, 0.3))',
                flexShrink: 0
              }}
            />
            <div style={{ 
              position: 'relative', 
              flex: 1,
              opacity: animationPhase === 'shrinking' ? 0 : 1,
              transform: animationPhase === 'shrinking' ? 'scale(0.3) translateX(-60px)' : 'scale(1)',
              transition: 'all 0.6s ease-in-out'
            }}>
              {animationPhase === 'newBubble' && (
                <div 
                  style={{
                    background: 'white',
                    border: '2px solid #6E56CF',
                    borderRadius: '16px',
                    padding: '1rem 1.25rem',
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(110, 86, 207, 0.15)',
                    animation: 'bubblePop 0.5s ease-out'
                  }}
                >
                  {/* Speech bubble arrow */}
                  <div 
                    style={{
                      position: 'absolute',
                      left: '-10px',
                      top: '16px',
                      width: 0,
                      height: 0,
                      borderTop: '10px solid transparent',
                      borderBottom: '10px solid transparent',
                      borderRight: '10px solid #6E56CF'
                    }}
                  />
                  <div 
                    style={{
                      position: 'absolute',
                      left: '-7px',
                      top: '17px',
                      width: 0,
                      height: 0,
                      borderTop: '9px solid transparent',
                      borderBottom: '9px solid transparent',
                      borderRight: '9px solid white'
                    }}
                  />
                  
                  <p style={{ margin: 0, fontSize: '0.9375rem', color: '#374151', lineHeight: '1.6' }}>
                    Loosen my training to see a wider range of profiles!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show "Adjust Preferences" button when animation completes */}
      {allReviewed && animationPhase === 'newBubble' && (
        <div className="text-center py-3">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => {
              if (positionId) {
                window.location.href = `/poster/position/${positionId}/preferences`;
              } else {
                window.location.href = '/poster/dashboard';
              }
            }}
            style={{
              animation: 'fadeIn 0.5s ease-in',
              animationDelay: '0.3s',
              animationFillMode: 'both'
            }}
          >
            <i className="fas fa-sliders-h me-2"></i>Modify Training
          </button>
        </div>
      )}

      <div className="mb-3">
        {candidates === null ? (
          <AILoadingScreen aiName={aiName} type="candidates" />
        ) : (
          <CandidateSwiper initialCandidates={candidates} onAllReviewed={handleAllReviewed} />
        )}
      </div>

      <style jsx>{`
        @keyframes bubblePop {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-20px);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Layout>
  )
}
