import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Select from 'react-select';
import { State, City } from 'country-state-city';
import { API_CONFIG } from '../../config/api';

const API = API_CONFIG.BASE_URL;

export default function SeekerPreferences() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Job categories grouped by related fields
  const JOB_CATEGORIES = [
    ['Software Engineering', 1], ['Data Engineering', 1], ['Data Science & Machine Learning', 1],
    ['Analytics & Business Intelligence', 1], ['Cloud & DevOps', 1], ['Cybersecurity', 1],
    ['IT Infrastructure & Networking', 1], ['QA & Test Engineering', 1], ['Mobile Development', 1],
    ['Game Development', 1], ['Product Management', 2], ['Program & Project Management', 2],
    ['UX / UI Design', 2], ['User Research', 2], ['Technical Product Management', 2],
    ['Business Operations', 3], ['Strategy & Management Consulting', 3], ['Finance & Accounting', 3],
    ['Risk, Compliance & Audit', 3], ['Supply Chain & Logistics', 3], ['Procurement & Vendor Management', 3],
    ['Sales & Business Development', 4], ['Account Management & Customer Success', 4],
    ['Marketing & Growth', 4], ['Digital Marketing & SEO', 4], ['Content Marketing & Brand', 4],
    ['Human Resources & Recruiting', 5], ['People Operations & Culture', 5], ['Legal & Corporate Affairs', 5],
    ['Clinical & Patient Care', 6], ['Healthcare Administration', 6], ['Medical Research & Biotech', 6],
    ['Pharmaceutical & Life Sciences', 6], ['Creative Direction & Brand Design', 7],
    ['Content Creation & Copywriting', 7], ['Media Production & Editing', 7],
    ['Entertainment & Gaming', 7], ['Manufacturing & Engineering', 8], ['Construction & Real Estate', 8],
    ['Energy & Utilities', 8], ['Transportation & Logistics', 8], ['Agriculture & Food Services', 8],
    ['Retail & E-commerce', 8], ['Hospitality & Tourism', 8], ['Education & Training', 8],
    ['Nonprofit & Social Services', 8], ['Government & Public Sector', 8]
  ];

  // Form state
  const [preferences, setPreferences] = useState({
    jobCategory: '',
    jobCategoryPriority: 'Flexible',
    workSetting: [],
    workSettingPriority: 'Flexible',
    preferredCities: ['', '', ''],
    salaryPriority: 'Flexible',
    travelRequirements: '',
    travelRequirementsPriority: 'Flexible',
    companySize: '',
    companySizePriority: 'Flexible',
    employmentType: '',
    employmentTypePriority: 'Flexible'
  });

  // Salary state variables (matching edit-profile format)
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

  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions1, setCityOptions1] = useState([]);
  const [cityOptions2, setCityOptions2] = useState([]);
  const [cityOptions3, setCityOptions3] = useState([]);
  const [selectedStates, setSelectedStates] = useState(['', '', '']);

  useEffect(() => {
    // Load US states
    const states = State.getStatesOfCountry('US').map(s => ({ value: s.isoCode, label: s.name }));
    setStateOptions(states);
  }, []);

  useEffect(() => {
    // Load preferences
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) {
      router.push('/seeker/login');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API}/api/SeekerPreferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/seeker/login');
            return;
          }
          throw new Error('Failed to load preferences');
        }

        const data = await res.json();

        // Load seeker profile to get default values
        const seekerRes = await fetch(`${API}/api/seekers/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let seekerDefaults = {
          defaultCity: '',
          defaultJobCategory: '',
          defaultWorkSetting: [],
          defaultSalary: '',
          defaultTravel: ''
        };

        if (seekerRes.ok) {
          const seekerData = await seekerRes.json();
          const seeker = seekerData.seeker ?? seekerData;
          
          // Get city/state from profile
          const city = seeker?.city ?? seeker?.City ?? '';
          const state = seeker?.state ?? seeker?.State ?? '';
          seekerDefaults.defaultCity = city && state ? `${city}, ${state}` : city;
          
          // Get job category from profile
          seekerDefaults.defaultJobCategory = seeker?.jobCategory ?? seeker?.JobCategory ?? '';
          
          // Get work setting from profile (comma-separated string to array)
          const workSettingStr = seeker?.workSetting ?? seeker?.WorkSetting ?? '';
          seekerDefaults.defaultWorkSetting = workSettingStr ? workSettingStr.split(',').map(s => s.trim()).filter(Boolean) : [];
          
          // Get salary from profile
          seekerDefaults.defaultSalary = seeker?.preferredSalary ?? seeker?.PreferredSalary ?? '';
          
          // Get travel from profile
          seekerDefaults.defaultTravel = seeker?.travel ?? seeker?.Travel ?? '';
        }

        // Parse salary from preferences or seeker profile
        const salaryStr = data.salary || seekerDefaults.defaultSalary;
        if (salaryStr) {
          // Parse format: "Type: $min - $max"
          const rangeMatch = salaryStr.match(/^(\w+):\s*\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
          if (rangeMatch) {
            setSalaryType(rangeMatch[1] || 'None');
            setSalaryMin(rangeMatch[2].replace(/,/g, ''));
            setSalaryMax(rangeMatch[3].replace(/,/g, ''));
          } else {
            // Try "Type: $min+"
            const minMatch = salaryStr.match(/^(\w+):\s*\$?([\d,]+)\+/);
            if (minMatch) {
              setSalaryType(minMatch[1] || 'None');
              setSalaryMin(minMatch[2].replace(/,/g, ''));
              setSalaryMax('');
            } else {
              // Try "Type: Up to $max"
              const maxMatch = salaryStr.match(/^(\w+):\s*Up to\s*\$?([\d,]+)/);
              if (maxMatch) {
                setSalaryType(maxMatch[1] || 'None');
                setSalaryMin('');
                setSalaryMax(maxMatch[2].replace(/,/g, ''));
              }
            }
          }
        }

        setPreferences({
          jobCategory: data.jobCategory || seekerDefaults.defaultJobCategory,
          jobCategoryPriority: data.jobCategoryPriority || 'None',
          workSetting: data.workSetting 
            ? data.workSetting.split(',').map(s => s.trim()).filter(Boolean)
            : seekerDefaults.defaultWorkSetting,
          workSettingPriority: data.workSettingPriority || 'None',
          preferredCities: data.preferredCities && data.preferredCities.length > 0 
            ? [...data.preferredCities, '', ''].slice(0, 3)
            : [seekerDefaults.defaultCity, '', ''],
          salaryPriority: data.salaryPriority || 'None',
          travelRequirements: data.travelRequirements || seekerDefaults.defaultTravel,
          travelRequirementsPriority: data.travelRequirementsPriority || 'None',
          companySize: data.companySize || '',
          companySizePriority: data.companySizePriority || 'None',
          employmentType: data.employmentType || '',
          employmentTypePriority: data.employmentTypePriority || 'None'
        });

      } catch (err) {
        console.error(err);
        setError('Failed to load preferences');
      }
    })();
  }, []);

  const handleWorkSettingChange = (setting) => {
    const current = preferences.workSetting;
    if (current.includes(setting)) {
      setPreferences({
        ...preferences,
        workSetting: current.filter(s => s !== setting)
      });
    } else {
      setPreferences({
        ...preferences,
        workSetting: [...current, setting]
      });
    }
  };

  const handleStateChange = (index, stateCode) => {
    const newStates = [...selectedStates];
    newStates[index] = stateCode;
    setSelectedStates(newStates);

    // Reset city when state changes
    const newCities = [...preferences.preferredCities];
    newCities[index] = '';
    setPreferences({ ...preferences, preferredCities: newCities });

    // Load cities for the selected state
    if (stateCode) {
      const cities = City.getCitiesOfState('US', stateCode).map(c => ({ value: c.name, label: c.name }));
      if (index === 0) setCityOptions1(cities);
      if (index === 1) setCityOptions2(cities);
      if (index === 2) setCityOptions3(cities);
    } else {
      if (index === 0) setCityOptions1([]);
      if (index === 1) setCityOptions2([]);
      if (index === 2) setCityOptions3([]);
    }
  };

  const handleCitySelect = (index, option) => {
    const cityVal = option ? option.value : '';
    const stateCode = selectedStates[index];
    const cityString = cityVal && stateCode ? `${cityVal}, ${stateCode}` : '';
    const newCities = [...preferences.preferredCities];
    newCities[index] = cityString;
    setPreferences({ ...preferences, preferredCities: newCities });
  };

  // When preferences load, hydrate state/city selectors for existing values
  useEffect(() => {
    const cities = preferences.preferredCities || [];
    const newStates = [...selectedStates];

    cities.forEach((cityStr, idx) => {
      if (!cityStr) return;
      const parts = cityStr.split(',');
      if (parts.length < 2) return;
      const city = parts[0].trim();
      const state = parts[1].trim();
      if (!state) return;

      newStates[idx] = state;
      const cityOptions = City.getCitiesOfState('US', state).map(c => ({ value: c.name, label: c.name }));
      if (idx === 0) setCityOptions1(cityOptions);
      if (idx === 1) setCityOptions2(cityOptions);
      if (idx === 2) setCityOptions3(cityOptions);

      // Ensure city appears in the options list
      if (!cityOptions.find(o => o.value === city)) {
        const extended = [...cityOptions, { value: city, label: city }];
        if (idx === 0) setCityOptions1(extended);
        if (idx === 1) setCityOptions2(extended);
        if (idx === 2) setCityOptions3(extended);
      }
    });

    setSelectedStates(newStates);
  }, [preferences.preferredCities]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      if (!token) {
        router.push('/seeker/login');
        return;
      }

      // Filter out empty cities
      const citiesToSave = preferences.preferredCities.filter(c => c.trim() !== '');

      // Format salary like edit-profile does
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

      const res = await fetch(`${API}/api/SeekerPreferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          JobCategory: preferences.jobCategory,
          JobCategoryPriority: preferences.jobCategoryPriority,
          WorkSetting: preferences.workSetting.join(', '),
          WorkSettingPriority: preferences.workSettingPriority,
          PreferredCities: citiesToSave,
          Salary: formattedSalary,
          SalaryPriority: preferences.salaryPriority,
          TravelRequirements: preferences.travelRequirements,
          TravelRequirementsPriority: preferences.travelRequirementsPriority,
          CompanySize: preferences.companySize,
          CompanySizePriority: preferences.companySizePriority,
          EmploymentType: preferences.employmentType,
          EmploymentTypePriority: preferences.employmentTypePriority
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to save preferences');
      }

      setSuccess('Preferences saved successfully!');
      setTimeout(() => {
        router.push('/seeker/find-positions');
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const PriorityButtons = ({ value, onChange }) => {
    const priorities = ['None', 'Flexible', 'DealBreaker'];
    return (
      <div className="btn-group" role="group">
        {priorities.map(p => (
          <button
            key={p}
            type="button"
            className={`btn ${value === p ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => onChange(p)}
          >
            {p === 'DealBreaker' ? 'Deal Breaker' : p}
          </button>
        ))}
      </div>
    );
  };

  const needsCityFields = preferences.workSetting.includes('Hybrid') || preferences.workSetting.includes('In-Person');

  return (
    <Layout title="Set Preferences — Job Seeker">
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Set Your Job Preferences</h2>
              <Link href="/seeker/find-positions" className="btn btn-outline-secondary">
                Back to Find Positions
              </Link>
            </div>

            <div className="alert alert-info">
              <strong>Filter Priority Levels:</strong>
              <ul className="mb-0 mt-2">
                <li><strong>None:</strong> No filtering applied for this criteria</li>
                <li><strong>Flexible:</strong> Preferred but not required</li>
                <li><strong>Deal Breaker:</strong> Must match - positions that don't match will be excluded</li>
              </ul>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {/* Job Category */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Job Category</h5>
                  <div className="mb-3">
                    <select
                      className="form-select"
                      value={preferences.jobCategory}
                      onChange={e => setPreferences({ ...preferences, jobCategory: e.target.value })}
                    >
                      <option value="">Select a category</option>
                      {JOB_CATEGORIES.map(c => <option key={c[0]} value={c[0]}>{c[0]}</option>)}
                    </select>
                  </div>
                  <PriorityButtons
                    value={preferences.jobCategoryPriority}
                    onChange={val => setPreferences({ ...preferences, jobCategoryPriority: val })}
                  />
                </div>
              </div>

              {/* Work Setting */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Work Setting</h5>
                  <div className="mb-3">
                    {['Remote', 'Hybrid', 'In-Person'].map(setting => (
                      <div key={setting} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`work-${setting}`}
                          checked={preferences.workSetting.includes(setting)}
                          onChange={() => handleWorkSettingChange(setting)}
                        />
                        <label className="form-check-label" htmlFor={`work-${setting}`}>
                          {setting}
                        </label>
                      </div>
                    ))}
                  </div>
                  <PriorityButtons
                    value={preferences.workSettingPriority}
                    onChange={val => setPreferences({ ...preferences, workSettingPriority: val })}
                  />
                </div>
              </div>

              {/* Preferred Cities (only show if Hybrid or In-Person selected) */}
              {needsCityFields && (
                <div className="card mb-3">
                  <div className="card-body">
                    <h5 className="card-title">Preferred Cities (Max 3)</h5>
                    <p className="text-muted small">Enter cities for location-based filtering when Hybrid or In-Person is selected</p>
                    {[0, 1, 2].map(index => {
                      const cityOptions = index === 0 ? cityOptions1 : index === 1 ? cityOptions2 : cityOptions3;
                      const stateValue = selectedStates[index];
                      const cityValue = preferences.preferredCities[index]
                        ? preferences.preferredCities[index].split(',')[0].trim()
                        : '';
                      const cityOptionValue = cityOptions.find(o => o.value === cityValue) || (cityValue ? { value: cityValue, label: cityValue } : null);
                      return (
                        <div key={index} className="mb-3">
                          <label className="form-label">City {index + 1} {index === 0 && '(defaults to your profile city)'}</label>
                          <div className="row g-2">
                            <div className="col-md-4">
                              <Select
                                options={stateOptions}
                                isClearable
                                placeholder="Select state"
                                value={stateOptions.find(o => o.value === stateValue) || null}
                                onChange={opt => handleStateChange(index, opt ? opt.value : '')}
                              />
                            </div>
                            <div className="col-md-8">
                              <Select
                                options={cityOptions}
                                isClearable
                                isSearchable
                                placeholder={stateValue ? "Select city" : "Choose state first"}
                                value={cityOptionValue}
                                onChange={opt => handleCitySelect(index, opt)}
                                isDisabled={!stateValue}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Salary */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Salary Expectations</h5>
                  <p className="text-muted small">Pre-loaded from your profile. Select type and enter min/max range.</p>
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
                    value={preferences.salaryPriority}
                    onChange={val => setPreferences({ ...preferences, salaryPriority: val })}
                  />
                </div>
              </div>

              {/* Travel Requirements */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Travel Willingness</h5>
                  <p className="text-muted small">This will match against position travel requirements</p>
                  <div className="mb-3">
                    <select
                      className="form-select"
                      value={preferences.travelRequirements}
                      onChange={e => setPreferences({ ...preferences, travelRequirements: e.target.value })}
                    >
                      <option value="">Select travel preference</option>
                      <option value="No">No travel required</option>
                      <option value="Maybe">Occasional travel</option>
                      <option value="Yes">Frequent travel required</option>
                    </select>
                  </div>
                  <PriorityButtons
                    value={preferences.travelRequirementsPriority}
                    onChange={val => setPreferences({ ...preferences, travelRequirementsPriority: val })}
                  />
                </div>
              </div>

              {/* Company Size */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Company Size</h5>
                  <div className="mb-3">
                    <select
                      className="form-select"
                      value={preferences.companySize}
                      onChange={e => setPreferences({ ...preferences, companySize: e.target.value })}
                    >
                      <option value="">Select company size</option>
                      <option value="Small">Small (&lt;500)</option>
                      <option value="Medium">Medium (500-1000)</option>
                      <option value="Large">Large (1000+)</option>
                    </select>
                  </div>
                  <PriorityButtons
                    value={preferences.companySizePriority}
                    onChange={val => setPreferences({ ...preferences, companySizePriority: val })}
                  />
                </div>
              </div>

              {/* Employment Type */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">Employment Type</h5>
                  <div className="mb-3">
                    <select
                      className="form-select"
                      value={preferences.employmentType}
                      onChange={e => setPreferences({ ...preferences, employmentType: e.target.value })}
                    >
                      <option value="">Select employment type</option>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  <PriorityButtons
                    value={preferences.employmentTypePriority}
                    onChange={val => setPreferences({ ...preferences, employmentTypePriority: val })}
                  />
                </div>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
                <Link href="/seeker/find-positions" className="btn btn-outline-secondary">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
