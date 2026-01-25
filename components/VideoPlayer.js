import React, { useState, useRef, useEffect } from 'react';

/**
 * Unified VideoPlayer Component
 * Handles both vertical and horizontal videos with modern UX
 * Features: Play button overlay, progress bar, mute toggle, fullscreen
 * Used across all modals: JobPostCard, PositionSwiper, edit-position, etc.
 */
export default function VideoPlayer({ videoUrl, title = "Video", autoPlay = false, className = "" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Auto-hide controls after 3 seconds of inactivity
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay failed, user interaction required
      });
    }
  }, [autoPlay]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.mozRequestFullScreen) {
        videoRef.current.mozRequestFullScreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress || 0);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="d-flex align-items-center justify-content-center bg-light" style={{ height: '400px', borderRadius: '8px' }}>
        <p className="text-muted">No video available</p>
      </div>
    );
  }

  return (
    <div 
      className={`position-relative bg-dark d-flex align-items-center justify-content-center ${className}`}
      style={{ 
        width: '100%',
        minHeight: '400px',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: isPlaying && !showControls ? 'none' : 'pointer'
      }}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 1000);
        }
      }}
      onClick={togglePlay}
    >
      {/* Video Element - object-fit:contain handles vertical/horizontal automatically */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-100 h-100"
        style={{ 
          objectFit: 'contain',
          backgroundColor: '#000',
          maxHeight: '70vh'
        }}
        onPlay={() => {
          setIsPlaying(true);
          resetControlsTimeout();
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        playsInline
      />

      {/* Center Play Button Overlay (when paused) */}
      {!isPlaying && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s ease'
            }}
          >
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              style={{ marginLeft: '4px' }}
            >
              <path 
                d="M8 5v14l11-7z" 
                fill="#0d6efd"
                stroke="#0d6efd"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (auto-hides during playback) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
          padding: '40px 16px 16px 16px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 20,
          pointerEvents: showControls ? 'auto' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div 
          className="mb-3"
          style={{ 
            width: '100%', 
            height: '4px', 
            backgroundColor: 'rgba(255,255,255,0.3)', 
            borderRadius: '2px',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={handleProgressClick}
        >
          <div 
            style={{ 
              width: `${progress}%`, 
              height: '100%', 
              backgroundColor: '#0d6efd',
              borderRadius: '2px',
              transition: 'width 0.1s linear'
            }}
          />
          {/* Progress Handle */}
          <div
            style={{
              position: 'absolute',
              left: `${progress}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              backgroundColor: '#0d6efd',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          />
        </div>

        {/* Control Buttons */}
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            {/* Play/Pause Button */}
            <button
              className="btn btn-link text-white p-0"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              style={{ fontSize: '20px', textDecoration: 'none' }}
            >
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>

            {/* Volume Button */}
            <button
              className="btn btn-link text-white p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              style={{ fontSize: '18px', textDecoration: 'none' }}
            >
              <i className={`fas fa-volume-${isMuted ? 'mute' : 'up'}`}></i>
            </button>

            {/* Time Display */}
            <span className="text-white small" style={{ minWidth: '80px' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            className="btn btn-link text-white p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            style={{ fontSize: '18px', textDecoration: 'none' }}
          >
            <i className="fas fa-expand"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
