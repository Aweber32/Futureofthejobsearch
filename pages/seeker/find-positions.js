import Layout from '../../components/Layout'
import PositionSwiper from '../../components/PositionSwiper'
import AILoadingScreen from '../../components/AILoadingScreen'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { API_CONFIG } from '../../config/api'

export default function FindPositions(){
  const [positions, setPositions] = useState(null);
  const [aiName, setAiName] = useState('AI Assistant');
  const [allReviewed, setAllReviewed] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('initial'); // 'initial' | 'shrinking' | 'newBubble'

  useEffect(()=>{
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
        
        // Fetch AI assistant name
        if (token) {
          try {
            const aiResponse = await fetch(`${base}/api/AIAssistant`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              if (!cancelled) setAiName(aiData.name || 'AI Assistant');
            }
          } catch (e) { /* ignore */ }
        }
        const res = await fetch(`${base}/api/positions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!res.ok){ setPositions([]); return; }
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.positions || data);

        // try to fetch any existing seeker-side interests so the swiper can PATCH instead of creating duplicates
        try{
          const q = new URLSearchParams(window.location.search).get('positionId');
          const r2 = await fetch(`${base}/api/positioninterests?`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          });
          if (r2.ok){
            const ints = await r2.json();
            const interests = Array.isArray(ints) ? ints : (ints.positionInterests || ints);
            const map = new Map();
            (interests||[]).forEach(i => map.set(i.positionId ?? i.PositionId ?? i.Position?.id ?? i.Position?.Id, i));
            const merged = (list||[]).map(p => ({ ...p, _interest: map.get(p.id ?? p.Id) || null }));
            if (!cancelled) setPositions(merged);
            return;
          }
        }catch(e){ /* ignore */ }

        if (!cancelled) setPositions(Array.isArray(list) ? list : []);
      }catch(err){ if (!cancelled) setPositions([]); }
    }
    load();
    return ()=>{ cancelled = true; }
  },[]);

  // Animation sequence when all positions reviewed
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
    <Layout title="Find Positions">
      <div className="alert alert-info mb-3" role="alert">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Beta:</strong> Will show already reviewed profiles for testing purposes
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Find Positions</h2>
        <div>
          <Link href="/seeker/dashboard" className="btn btn-outline-secondary">Return</Link>
        </div>
      </div>

      {/* AI Assistant Speech Bubble - Initial State */}
      {positions !== null && !allReviewed && (
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
                Hello! I found <strong style={{ color: '#6E56CF' }}>{positions.length}</strong> {positions.length === 1 ? 'position' : 'positions'} that I think relate to you.
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
                    Loosen my training to see a wider range of positions!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show "Modify Training" button when animation completes */}
      {allReviewed && animationPhase === 'newBubble' && (
        <div className="text-center py-3">
          <Link 
            href="/seeker/preferences"
            className="btn btn-primary"
            style={{
              animation: 'fadeIn 0.5s ease-in',
              animationDelay: '0.3s',
              animationFillMode: 'both'
            }}
          >
            <i className="fas fa-sliders-h me-2"></i>Modify Training
          </Link>
        </div>
      )}

      <div className="mb-3">
        {positions === null ? (
          <AILoadingScreen aiName={aiName} type="positions" />
        ) : (
          <PositionSwiper initialPositions={positions} onAllReviewed={handleAllReviewed} />
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
// ...existing code above retained
