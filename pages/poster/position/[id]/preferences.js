import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import { API_CONFIG } from '../../../../config/api';
import { JOB_CATEGORIES, EDUCATION_LEVELS } from '../../../../utils/constants';

const API = API_CONFIG.BASE_URL;

export default function PositionPreferences() {
  const router = useRouter();
  const { id: positionId } = router.query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [position, setPosition] = useState(null);
  const [aiName, setAiName] = useState('AI Assistant');

  // Salary state variables (matching seeker preferences format)
  const [salaryType, setSalaryType] = useState('None');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  // Helper functions for salary formatting
  function formatWithCommas(val) {
    if (val === null || val === undefined || val === "") return "";
    const s = String(val);
    const parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (parts.length > 1) return parts[0] + '.' + parts[1].slice(0,2);
    return parts[0];
  }

  function unformatInput(str) {
    if (!str && str !== 0) return "";
    const cleaned = String(str).replace(/,/g, "").replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
    return before + after;
  }

  // Form state
  const [preferences, setPreferences] = useState({
    jobCategory: '',
    jobCategoryPriority: 'None',
    educationLevel: [],
    educationLevelPriority: 'None',
    yearsExpMin: '',
    yearsExpPriority: 'None',
    workSetting: [],
    workSettingPriority: 'None',
    travelRequirements: '',
    travelRequirementsPriority: 'None',
    preferredSalaryMin: '',
    preferredSalaryMax: '',
    preferredSalaryPriority: 'None'
  });

  // Load position and preferences
  useEffect(() => {
    if (!positionId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) {
      router.push('/poster/login');
      return;
    }

    (async () => {
      try {
        // Fetch AI assistant name
        const aiResponse = await fetch(`${API}/api/AIAssistant`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          setAiName(aiData.name || 'AI Assistant');
        }

        // Load position details
        const posRes = await fetch(`${API}/api/positions/${positionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!posRes.ok) throw new Error('Failed to load position');
        const posData = await posRes.json();
        setPosition(posData);

        // Load preferences
        const prefRes = await fetch(`${API}/api/positionpreferences/${positionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (prefRes.ok) {
          const data = await prefRes.json();
          
          // Check if this is actually saved preferences or just defaults (no Id means no saved prefs)
          const hasSavedPrefs = data.id || data.Id;
          
          // Always extract position data to use as fallback defaults
          const posCategory = posData.category || posData.Category || '';
          const posWorkSetting = posData.workSetting || posData.WorkSetting || '';
          let posTravel = posData.travelRequirements || posData.TravelRequirements || '';
          if (posTravel === 'None') posTravel = '';
          
          // Extract education levels from position's Educations collection
          const posEducations = posData.educations || posData.Educations || [];
          const posEducationLevels = posEducations.map(e => e.education || e.Education).filter(Boolean);
          
          const posSalaryType = posData.salaryType || posData.SalaryType || 'None';
          const posSalaryMin = posData.salaryMin || posData.SalaryMin || null;
          const posSalaryMax = posData.salaryMax || posData.SalaryMax || null;
          
          if (!hasSavedPrefs) {
            // No saved preferences - use position data as defaults with "Flexible" priorities
            console.log('No saved prefs - using position data as defaults');
            
            if (posSalaryType && posSalaryType !== 'None') {
              setSalaryType(posSalaryType);
              setSalaryMin(posSalaryMin ? posSalaryMin.toString() : '');
              setSalaryMax(posSalaryMax ? posSalaryMax.toString() : '');
            }
            
            setPreferences({
              jobCategory: posCategory,
              jobCategoryPriority: posCategory ? 'Flexible' : 'None',
              educationLevel: posEducationLevels,
              educationLevelPriority: posEducationLevels.length > 0 ? 'Flexible' : 'None',
              yearsExpMin: '',
              yearsExpMax: '',
              yearsExpPriority: 'None',
              workSetting: posWorkSetting ? posWorkSetting.split(',').map(s => s.trim()).filter(Boolean) : [],
              workSettingPriority: posWorkSetting ? 'Flexible' : 'None',
              travelRequirements: posTravel,
              travelRequirementsPriority: posTravel ? 'Flexible' : 'None',
              preferredSalaryPriority: (posSalaryType && posSalaryType !== 'None') ? 'Flexible' : 'None'
            });
          } else {
            // Has saved preferences - use them, but fall back to position data for empty fields
            console.log('Has saved prefs - using saved values with position fallbacks');
            
            // Parse salary from saved preferences or fall back to position data
            const savedSalaryStr = data.preferredSalary || '';
            if (savedSalaryStr) {
              // Parse format: "Type: $min - $max"
              const rangeMatch = savedSalaryStr.match(/^(\w+):\s*\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
              if (rangeMatch) {
                setSalaryType(rangeMatch[1] || 'None');
                setSalaryMin(rangeMatch[2].replace(/,/g, ''));
                setSalaryMax(rangeMatch[3].replace(/,/g, ''));
              } else {
                // Try "Type: $min+"
                const minMatch = savedSalaryStr.match(/^(\w+):\s*\$?([\d,]+)\+/);
                if (minMatch) {
                  setSalaryType(minMatch[1] || 'None');
                  setSalaryMin(minMatch[2].replace(/,/g, ''));
                  setSalaryMax('');
                } else {
                  // Try "Type: Up to $max"
                  const maxMatch = savedSalaryStr.match(/^(\w+):\s*Up to\s*\$?([\d,]+)/);
                  if (maxMatch) {
                    setSalaryType(maxMatch[1] || 'None');
                    setSalaryMin('');
                    setSalaryMax(maxMatch[2].replace(/,/g, ''));
                  }
                }
              }
            } else if (posSalaryType && posSalaryType !== 'None') {
              // Fall back to position data when no saved salary
              setSalaryType(posSalaryType);
              setSalaryMin(posSalaryMin ? posSalaryMin.toString() : '');
              setSalaryMax(posSalaryMax ? posSalaryMax.toString() : '');
            }
            
            // Use saved preferences exactly as stored - no fallback to Flexible
            setPreferences({
              jobCategory: data.jobCategory || '',
              jobCategoryPriority: data.jobCategoryPriority || 'None',
              educationLevel: data.educationLevel ? data.educationLevel.split(',').map(s => s.trim()).filter(Boolean) : [],
              educationLevelPriority: data.educationLevelPriority || 'None',
              yearsExpMin: data.yearsExpMin || '',
              yearsExpPriority: data.yearsExpPriority || 'None',
              workSetting: data.workSetting ? data.workSetting.split(',').map(s => s.trim()).filter(Boolean) : [],
              workSettingPriority: data.workSettingPriority || 'None',
              travelRequirements: data.travelRequirements || '',
              travelRequirementsPriority: data.travelRequirementsPriority || 'None',
              preferredSalaryPriority: data.preferredSalaryPriority || 'None'
            });
          }
        } else {
          // Pre-fill ALL fields from position data when no saved preferences exist
          // Set all priorities to "Flexible" as defaults
          const posCategory = posData.category || posData.Category || '';
          const posWorkSetting = posData.workSetting || posData.WorkSetting || '';
          let posTravel = posData.travelRequirements || posData.TravelRequirements || '';
          // Convert old "None" value to empty string to match dropdown
          if (posTravel === 'None') posTravel = '';
          
          console.log('No saved prefs - using position data:', {
            posCategory,
            posWorkSetting,
            posTravel,
            salaryType: posData.salaryType,
            salaryMin: posData.salaryMin,
            salaryMax: posData.salaryMax
          });
          
          if ((posData.salaryType || posData.SalaryType) && (posData.salaryType || posData.SalaryType) !== 'None') {
            setSalaryType(posData.salaryType || posData.SalaryType || 'None');
            setSalaryMin((posData.salaryMin || posData.SalaryMin) ? (posData.salaryMin || posData.SalaryMin).toString() : '');
            setSalaryMax((posData.salaryMax || posData.SalaryMax) ? (posData.salaryMax || posData.SalaryMax).toString() : '');
          }
          
          const newPrefs = {
            jobCategory: posCategory,
            jobCategoryPriority: posCategory ? 'Flexible' : 'None',
            educationLevel: '',
            educationLevelPriority: 'None',
            yearsExpMin: '',
            yearsExpPriority: 'None',
            workSetting: posWorkSetting ? posWorkSetting.split(',').map(s => s.trim()).filter(Boolean) : [],
            workSettingPriority: posWorkSetting ? 'Flexible' : 'None',
            travelRequirements: posTravel,
            travelRequirementsPriority: posTravel ? 'Flexible' : 'None',
            preferredSalaryPriority: (posData.salaryType && posData.salaryType !== 'None') ? 'Flexible' : 'None'
          };
          
          console.log('Setting new preferences:', newPrefs);
          setPreferences(newPrefs);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load preferences');
      }
    })();
  }, [positionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) {
      router.push('/poster/login');
      return;
    }

    try {
      // Format salary like seeker preferences
      let formattedSalary = '';
      if (salaryType !== 'None') {
        if (salaryMin && salaryMax) {
          formattedSalary = `${salaryType}: $${formatWithCommas(salaryMin)} - $${formatWithCommas(salaryMax)}`;
        } else if (salaryMin) {
          formattedSalary = `${salaryType}: $${formatWithCommas(salaryMin)}+`;
        } else if (salaryMax) {
          formattedSalary = `${salaryType}: Up to $${formatWithCommas(salaryMax)}`;
        }
      }
      
      const res = await fetch(`${API}/api/positionpreferences/${positionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          jobCategory: preferences.jobCategory,
          jobCategoryPriority: preferences.jobCategoryPriority,
          educationLevel: preferences.educationLevel.join(', '),
          educationLevelPriority: preferences.educationLevelPriority,
          yearsExpMin: preferences.yearsExpMin ? parseInt(preferences.yearsExpMin) : null,
          yearsExpPriority: preferences.yearsExpPriority,
          workSetting: preferences.workSetting.join(', '),
          workSettingPriority: preferences.workSettingPriority,
          travelRequirements: preferences.travelRequirements,
          travelRequirementsPriority: preferences.travelRequirementsPriority,
          preferredSalary: formattedSalary,
          preferredSalaryPriority: preferences.preferredSalaryPriority
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save preferences');
      }

      setSuccess('Preferences saved successfully!');
      setTimeout(() => {
        router.push(`/poster/find-candidates?positionId=${positionId}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkSettingChange = (setting) => {
    setPreferences(prev => {
      const current = prev.workSetting;
      if (current.includes(setting)) {
        return { ...prev, workSetting: current.filter(s => s !== setting) };
      } else {
        return { ...prev, workSetting: [...current, setting] };
      }
    });
  };

  const PriorityButtons = ({ value, onChange }) => (
    <div className="d-flex gap-2">
      {['None', 'Flexible', 'DealBreaker'].map(priority => (
        <button
          key={priority}
          type="button"
          onClick={() => onChange(priority)}
          className="btn btn-sm"
          style={{
            background: value === priority ? '#6E56CF' : 'white',
            color: value === priority ? 'white' : '#6b7280',
            border: `1px solid ${value === priority ? '#6E56CF' : '#e5e7eb'}`,
            borderRadius: '8px',
            padding: '0.375rem 0.75rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          {priority === 'DealBreaker' ? 'Deal Breaker' : priority}
        </button>
      ))}
    </div>
  );

  if (!positionId) {
    return <Layout title="Set Preferences"><div>Loading...</div></Layout>;
  }

  return (
    <Layout title="Set Candidate Preferences">
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header Section with AI Logo */}
        <div className="card mb-4 border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex align-items-center mb-3">
              <img 
                src="/futureofthejobsearchAI_logo.png" 
                alt="AI Assistant" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.4))',
                  marginRight: '20px'
                }}
              />
              <div className="flex-grow-1">
                <h2 className="mb-2">Teach {aiName} Your Preferences</h2>
                {position && (
                  <p className="text-muted mb-2">
                    For position: <strong>{position.title}</strong>
                  </p>
                )}
                <p className="text-muted mb-0">
                  Help {aiName} understand what you're looking for. Be specific about what matters most, 
                  but avoid being too restrictive — this allows {aiName} to discover great candidates 
                  you might not have considered.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            <strong>Priority Levels:</strong> <em>None</em> (no filtering), <em>Flexible</em> (stored for future ranking), <em>Deal Breaker</em> (hard filter applied)
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">{error}</div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Job Category */}
          <div className="card mb-3" style={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <div className="card-body">
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Job Category</h5>
              <select
                className="form-control mb-3"
                value={preferences.jobCategory}
                onChange={(e) => setPreferences({ ...preferences, jobCategory: e.target.value })}
              >
                <option value="">Select category</option>
                {JOB_CATEGORIES.map(cat => (
                  <option key={cat[0]} value={cat[0]}>{cat[0]}</option>
                ))}
              </select>
              <PriorityButtons
                value={preferences.jobCategoryPriority}
                onChange={(val) => setPreferences({ ...preferences, jobCategoryPriority: val })}
              />
            </div>
          </div>

          {/* Education Level */}
          <div className="card mb-3" style={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <div className="card-body">
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Education Level</h5>
              <div className="mb-3">
                {EDUCATION_LEVELS.map(level => (
                  <div key={level} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`educationLevel-${level}`}
                      checked={preferences.educationLevel.includes(level)}
                      onChange={() => {
                        setPreferences(prev => {
                          const current = prev.educationLevel;
                          if (current.includes(level)) {
                            return { ...prev, educationLevel: current.filter(l => l !== level) };
                          } else {
                            return { ...prev, educationLevel: [...current, level] };
                          }
                        });
                      }}
                    />
                    <label className="form-check-label" htmlFor={`educationLevel-${level}`}>
                      {level}
                    </label>
                  </div>
                ))}
              </div>
              <PriorityButtons
                value={preferences.educationLevelPriority}
                onChange={(val) => setPreferences({ ...preferences, educationLevelPriority: val })}
              />
            </div>
          </div>

          {/* Years Experience */}
          <div className="card mb-3" style={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <div className="card-body">
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Minimum Years of Experience</h5>
              <div className="mb-3">
                <label className="form-label">Minimum Years Required</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  value={preferences.yearsExpMin}
                  onChange={(e) => setPreferences({ ...preferences, yearsExpMin: e.target.value })}
                  placeholder="e.g., 3"
                />
                <small className="form-text text-muted">Candidates must have at least this many years of total experience</small>
              </div>
              <PriorityButtons
                value={preferences.yearsExpPriority}
                onChange={(val) => setPreferences({ ...preferences, yearsExpPriority: val })}
              />
            </div>
          </div>

          {/* Work Setting */}
          <div className="card mb-3" style={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <div className="card-body">
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Work Setting</h5>
              <div className="mb-3">
                {['Remote', 'In-office', 'Hybrid', 'On-site'].map(setting => (
                  <div key={setting} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`workSetting-${setting}`}
                      checked={preferences.workSetting.includes(setting)}
                      onChange={() => handleWorkSettingChange(setting)}
                    />
                    <label className="form-check-label" htmlFor={`workSetting-${setting}`}>
                      {setting}
                    </label>
                  </div>
                ))}
              </div>
              <PriorityButtons
                value={preferences.workSettingPriority}
                onChange={(val) => setPreferences({ ...preferences, workSettingPriority: val })}
              />
            </div>
          </div>

          {/* Travel Requirements */}
          <div className="card mb-3" style={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <div className="card-body">
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Travel Requirements</h5>
              <select
                className="form-control mb-3"
                value={preferences.travelRequirements}
                onChange={(e) => setPreferences({ ...preferences, travelRequirements: e.target.value })}
              >
                <option value="">Select travel requirement</option>
                <option value="No">No travel required</option>
                <option value="Maybe">Occasional travel</option>
                <option value="Yes">Frequent travel required</option>
              </select>
              <PriorityButtons
                value={preferences.travelRequirementsPriority}
                onChange={(val) => setPreferences({ ...preferences, travelRequirementsPriority: val })}
              />
            </div>
          </div>

          {/* Preferred Salary */}
          <div className="card mb-3" style={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <div className="card-body">
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Salary Expectations</h5>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Pre-loaded from the position. Select type and enter min/max range.
              </p>
              <div className="mb-3">
                <div className="row g-2 align-items-center">
                  <div className="col-md-3">
                    <select 
                      className="form-select" 
                      value={salaryType} 
                      onChange={e => { 
                        setSalaryType(e.target.value); 
                        setSalaryMin(''); 
                        setSalaryMax(''); 
                      }}
                    >
                      <option value="None">None</option>
                      <option value="Hourly">Hourly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </div>
                  <div className="col-md-9">
                    {salaryType !== 'None' ? (
                      <div className="d-flex gap-2">
                        <input 
                          className="form-control" 
                          placeholder="Min" 
                          value={formatWithCommas(salaryMin)} 
                          onChange={e => setSalaryMin(unformatInput(e.target.value))} 
                        />
                        <input 
                          className="form-control" 
                          placeholder="Max" 
                          value={formatWithCommas(salaryMax)} 
                          onChange={e => setSalaryMax(unformatInput(e.target.value))} 
                        />
                      </div>
                    ) : (
                      <div className="small text-muted">No salary specified</div>
                    )}
                  </div>
                </div>
              </div>
              <PriorityButtons
                value={preferences.preferredSalaryPriority}
                onChange={(val) => setPreferences({ ...preferences, preferredSalaryPriority: val })}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => router.push(`/poster/find-candidates?positionId=${positionId}`)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #6E56CF 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                fontWeight: '500'
              }}
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
