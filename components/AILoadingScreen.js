import React, { useState, useEffect } from 'react'

const keyframeStyles = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(30px);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes progress {
    0% {
      width: 0%;
    }
    50% {
      width: 100%;
    }
    100% {
      width: 100%;
    }
  }
`

export default function AILoadingScreen({ aiName = 'AI Assistant', type = 'positions' }) {
  const [dotCount, setDotCount] = useState(0)
  
  const isCandidates = type === 'candidates';
  const itemLabel = isCandidates ? 'Candidates' : 'Positions';

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const dots = '.'.repeat(dotCount)

  return (
    <>
      <style>{keyframeStyles}</style>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Animated background elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)',
              top: '-100px',
              left: '-100px',
              animation: 'float 6s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)',
              bottom: '-50px',
              right: '-50px',
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Content container */}
        <div
          style={{
            textAlign: 'center',
            color: 'white',
            zIndex: 10,
            position: 'relative',
          }}
        >
          {/* AI Logo */}
          <div
            style={{
              marginBottom: '40px',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <img
              src="/futureofthejobsearchAI_logo.png"
              alt="AI Assistant"
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                margin: '0 auto',
                display: 'block',
                filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))'
              }}
            />
          </div>

          {/* Main text */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '10px',
              letterSpacing: '0.5px',
            }}
          >
            Here are {aiName}'s Curated {itemLabel}
          </h1>

          {/* Subtitle with animated dots */}
          <p
            style={{
              fontSize: '18px',
              marginBottom: '40px',
              opacity: 0.95,
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Loading your personalized matches{dots}
          </p>

          {/* Loading bar */}
          <div
            style={{
              width: '200px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              margin: '0 auto 30px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'white',
                borderRadius: '2px',
                animation: 'progress 2s ease-in-out infinite',
              }}
            />
          </div>

          {/* Helper text */}
          <p
            style={{
              fontSize: '14px',
              opacity: 0.8,
              maxWidth: '400px',
              margin: '0 auto',
              lineHeight: '1.5',
            }}
          >
            {aiName} has analyzed your {isCandidates ? 'position requirements' : 'profile and preferences'} to curate these {isCandidates ? 'candidates' : 'opportunities'} just for you. Review each {isCandidates ? 'candidate' : 'position'} and let us know what interests you.
          </p>
        </div>
      </div>
    </>
  )
}
