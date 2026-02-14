import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { API_CONFIG } from '../config/api';

export default function AINameModal({ show, onAICreated }) {
  const [aiName, setAiName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!aiName.trim()) {
      setError('Please enter a name for your AI assistant');
      return;
    }

    if (aiName.length > 100) {
      setError('Name must be 100 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/AIAssistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: aiName.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create AI assistant');
      }

      const data = await response.json();
      onAICreated(data);
    } catch (err) {
      console.error('Failed to create AI assistant:', err);
      setError(err.message || 'Failed to create AI assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div 
      className="modal show d-block" 
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content" style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
          <div className="modal-body p-0">
        <div className="text-center">
          {/* AI Logo - Larger and centered */}
          <div className="mb-4 position-relative d-inline-block">
            <img 
              src="/futureofthejobsearchAI_logo.png" 
              alt="AI Assistant" 
              style={{ 
                width: '250px', 
                height: '250px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 30px rgba(99, 102, 241, 0.6))',
                animation: 'float 3s ease-in-out infinite'
              }}
              className="mb-3"
            />
          </div>

          {/* Speech Bubble */}
          <div className="position-relative mx-auto" style={{ maxWidth: '600px' }}>
            <div 
              className="bg-white rounded-4 p-5 shadow-lg position-relative"
              style={{
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }}
            >
              {/* Speech bubble pointer */}
              <div 
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '20px solid transparent',
                  borderRight: '20px solid transparent',
                  borderBottom: '20px solid white'
                }}
              ></div>

          {/* Title */}
          <h2 className="h3 fw-bold mb-3">Meet Your Personal AI Assistant</h2>

          {/* Description */}
          <p className="text-muted mb-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
            Your AI assistant works 24/7 to scan our job bazaar and deliver the perfect opportunities tailored to your preferences. 
            No more endless scrolling or applications — just curated matches waiting for your review.
          </p>

          {/* Name Input */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="aiName" className="form-label fw-semibold">Give Your AI a Name</label>
              <input
                type="text"
                id="aiName"
                className="form-control form-control-lg text-center"
                placeholder="e.g., JobBot, CareerScout, OpportunityFinder"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                maxLength={100}
                disabled={loading}
                autoFocus
              />
              {error && (
                <div className="text-danger small mt-2">{error}</div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg px-5"
              disabled={loading || !aiName.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Your AI...
                </>
              ) : (
                <>
                  <Sparkles size={20} className="me-2" />
                  Let's Get Started
                </>
              )}
            </button>
          </form>

              {/* Info Text */}
              <p className="text-muted small mt-4 mb-0">
                You can change this name anytime in your profile settings
              </p>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
