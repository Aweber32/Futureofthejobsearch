import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles, Save, Loader } from 'lucide-react';
import Layout from '../../components/Layout';
import { API_CONFIG } from '../../config/api';

const API = API_CONFIG.BASE_URL;

export default function EditAI() {
  const router = useRouter();
  const [aiName, setAiName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) {
      router.push('/poster/login');
      return;
    }

    // Fetch current AI assistant
    (async () => {
      try {
        const response = await fetch(`${API}/api/AIAssistant`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setAiName(data.name || '');
          setOriginalName(data.name || '');
        } else if (response.status === 404) {
          // No AI exists, redirect to dashboard where modal will appear
          router.push('/poster/dashboard');
        }
      } catch (err) {
        console.error('Error fetching AI assistant:', err);
        setError('Failed to load AI assistant');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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

    if (aiName.trim() === originalName.trim()) {
      setError('Please make a change before saving');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const response = await fetch(`${API}/api/AIAssistant`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: aiName.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update AI assistant');
      }

      const data = await response.json();
      setOriginalName(data.name);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update AI assistant:', err);
      setError(err.message || 'Failed to update AI assistant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Edit AI Assistant">
        <div className="container py-5">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit AI Assistant">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-body p-5">
                {/* AI Logo */}
                <div className="text-center mb-4">
                  <img 
                    src="/futureofthejobsearchAI_logo.png" 
                    alt="AI Assistant" 
                    style={{ 
                      width: '150px', 
                      height: '150px', 
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.4))'
                    }}
                    className="mb-3"
                  />
                  <h2 className="h3 fw-bold mb-2">
                    <Sparkles className="text-primary me-2" size={28} style={{ marginTop: '-4px' }} />
                    Edit Your AI Assistant
                  </h2>
                  <p className="text-muted">Customize your AI assistant settings</p>
                </div>

                {/* Success Message */}
                {success && (
                  <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                    <Save size={20} className="me-2" />
                    <div>AI assistant updated successfully!</div>
                  </div>
                )}

                {/* Edit Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="aiName" className="form-label fw-semibold">
                      AI Assistant Name
                    </label>
                    <input
                      type="text"
                      id="aiName"
                      className="form-control form-control-lg"
                      placeholder="e.g., JobBot, CareerScout, OpportunityFinder"
                      value={aiName}
                      onChange={(e) => {
                        setAiName(e.target.value);
                        setError('');
                        setSuccess(false);
                      }}
                      maxLength={100}
                      disabled={saving}
                      autoFocus
                    />
                    <div className="form-text">
                      Choose a name that resonates with you. This is how you'll refer to your AI assistant.
                    </div>
                    {error && (
                      <div className="text-danger small mt-2">{error}</div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-3">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg px-4 flex-grow-1"
                      disabled={saving || !aiName.trim() || aiName.trim() === originalName.trim()}
                    >
                      {saving ? (
                        <>
                          <Loader size={20} className="me-2 spinner-border spinner-border-sm" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={20} className="me-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-lg px-4"
                      onClick={() => router.push('/poster/dashboard')}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Info Section */}
                <div className="mt-5 pt-4 border-top">
                  <h5 className="fw-semibold mb-3">About Your AI Assistant</h5>
                  <p className="text-muted small mb-2">
                    Your AI assistant works 24/7 to scan our job bazaar and deliver personalized opportunities based on your preferences.
                  </p>
                  <p className="text-muted small mb-0">
                    More customization options coming soon, including conversation style, notification preferences, and match criteria.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
