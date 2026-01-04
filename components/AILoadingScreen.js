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

export default function AILoadingScreen() {
  const [dotCount, setDotCount] = useState(0)

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
          {/* AI Icon / Brain Animation */}
          <div
            style={{
              marginBottom: '40px',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ margin: '0 auto', display: 'block' }}
            >
              {/* Brain-like shape */}
              <circle cx="40" cy="35" r="25" fill="none" stroke="white" strokeWidth="2" />
              <path
                d="M 25 35 Q 20 25 20 15 M 55 35 Q 60 25 60 15"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="30" cy="20" r="3" fill="white" />
              <circle cx="50" cy="20" r="3" fill="white" />
              {/* Nodes */}
              <circle cx="25" cy="40" r="2" fill="white" />
              <circle cx="55" cy="40" r="2" fill="white" />
              <circle cx="40" cy="55" r="2" fill="white" />
              {/* Connecting lines */}
              <line x1="30" y1="20" x2="25" y2="40" stroke="white" strokeWidth="1" opacity="0.6" />
              <line x1="50" y1="20" x2="55" y2="40" stroke="white" strokeWidth="1" opacity="0.6" />
              <line x1="25" y1="40" x2="40" y2="55" stroke="white" strokeWidth="1" opacity="0.6" />
              <line x1="55" y1="40" x2="40" y2="55" stroke="white" strokeWidth="1" opacity="0.6" />
            </svg>
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
            Finding Your Perfect Match
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
            Using AI to personalize your job search{dots}
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
            We're analyzing your profile, preferences, and skills to find the positions that match your unique strengths.
          </p>
        </div>
      </div>
    </>
  )
}
