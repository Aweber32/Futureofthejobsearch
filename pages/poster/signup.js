import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Select from 'react-select';
import { State, City } from 'country-state-city';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Signup(){
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: 'Acme Co',
    contactName: 'Jane Doe',
    website: '',
    companyDescription: '',
    companySize: 'Small',
  city: '',
  state: '',
    email: 'hello@acme.test',
  password: '',
  confirmPassword: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e){
    e.preventDefault();
    setError('');
    if (!form.companyName || !form.email || !form.password) {
      setError('Company name, login email and password are required');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try{
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CompanyName: form.companyName,
          ContactName: form.contactName,
          Website: form.website,
          CompanyDescription: form.companyDescription,
            CompanySize: form.companySize,
            City: form.city,
            State: form.state,
          Email: form.email,
          Password: form.password
        })
      });
      let data;
      const txt = await res.text();
      try { data = txt ? JSON.parse(txt) : {}; } catch { data = { message: txt }; }
      if (!res.ok) {
        // prefer common fields
        const msg = data.error || data.message || data.detail || txt || 'Registration failed';
        throw new Error(msg);
      }
      // success -> attempt to log in to receive JWT so dashboard can load immediately
      const employerId = data.employerId;
      let token = null;
      try {
        const loginRes = await fetch(`${API}/api/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Email: form.email, Password: form.password })
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          token = loginData?.token;
          if (token && typeof window !== 'undefined') localStorage.setItem('fjs_token', token);
        } else {
          // if login failed, surface message but continue to upload; user can login manually
          const txt = await loginRes.text();
          console.warn('Auto-login failed after registration:', txt);
        }
      } catch (e) {
        console.warn('Auto-login request failed', e);
      }

      if (logoFile && employerId) {
        // upload file
        const formData = new FormData();
        formData.append('file', logoFile, logoFile.name);
        const up = await fetch(`${API}/api/uploads/logo`, { method: 'POST', body: formData });
        let upTxt = await up.text();
        let upData;
        try { upData = upTxt ? JSON.parse(upTxt) : {}; } catch { upData = { url: upTxt }; }
          if (up.ok && upData.url) {
            // save logo URL to employer
            await fetch(`${API}/api/employers/${employerId}/logo`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ LogoUrl: upData.url })
            });
          }
      }
      // If we have a token, go to dashboard so it can fetch /api/auth/me and display the employer info.
      if (token) {
        router.push('/poster/dashboard');
      } else {
        // fallback: go to login so user can sign in
        router.push('/poster/login');
      }
    }catch(err){
      // show only the text message
      setError(typeof err === 'string' ? err : (err?.message ?? 'Registration failed'));
    }finally{ setLoading(false); }
  }

  useEffect(()=>{
    // load US states
    const states = State.getStatesOfCountry('US').map(s=>({ value: s.isoCode, label: s.name }));
    setStateOptions(states);
  },[]);

  useEffect(()=>{
    // load cities for selected state
    if (form.state) {
      const cities = City.getCitiesOfState('US', form.state).map(c=>({ value: c.name, label: c.name }));
      setCityOptions(cities);
    } else {
      setCityOptions([]);
    }
  },[form.state]);

  return (
    <Layout title="Sign up — Employer">
      <div className="row justify-content-center">
            <div className="row">
              <form className="mt-3" onSubmit={submit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Company name</label>
                    <input className="form-control" value={form.companyName} onChange={e=>setForm({...form, companyName: e.target.value})} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Website</label>
                    <input className="form-control" value={form.website} onChange={e=>setForm({...form, website: e.target.value})} />
                  </div>
                </div>

                {/* bottom logo input removed - top logo input retained */}

                <div className="mb-3">
                  <label className="form-label">Company description</label>
                  <textarea className="form-control" rows={4} value={form.companyDescription} onChange={e=>setForm({...form, companyDescription: e.target.value})} />
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Company size</label>
                    <select className="form-select" value={form.companySize} onChange={e=>setForm({...form, companySize: e.target.value})}>
                      <option value="Small">Small &lt;500</option>
                      <option value="Medium">Medium &gt;=500 &lt;1000</option>
                      <option value="Large">Large &gt;=1000</option>
                    </select>
                  </div>
                  <div className="col-md-5 mb-3">
                    <label className="form-label">Address</label>
                    <input className="form-control" value={form.address || ''} onChange={e=>setForm({...form, address: e.target.value})} />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">State</label>
                    <Select
                      options={stateOptions}
                      onChange={opt=>setForm({...form, state: opt?.value || ''})}
                      value={stateOptions.find(s=>s.value===form.state) || null}
                      isClearable
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">City</label>
                    <Select
                      options={cityOptions}
                      onChange={opt=>setForm({...form, city: opt?.value || ''})}
                      value={cityOptions.find(c=>c.value===form.city) || null}
                      isClearable
                      isDisabled={!form.state}
                      onFocus={() => { if (!form.state) { setError('Please choose state first'); setTimeout(()=>setError(''),3000); } }}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Company logo (optional)</label>
                    <input type="file" className="form-control" accept="image/*" onChange={e=>setLogoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                  </div>
                </div>

                <hr />

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact name</label>
                    <input className="form-control" value={form.contactName} onChange={e=>setForm({...form, contactName: e.target.value})} />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Login email</label>
                    <input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Confirm password</label>
                    <input type="password" className="form-control" value={form.confirmPassword} onChange={e=>setForm({...form, confirmPassword: e.target.value})} />
                  </div>
                </div>

                {/* company logo moved next to City */}

                {error && <div className="alert alert-danger">{error}</div>}

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading? 'Creating…' : 'Create account'}</button>
                  <Link href="/poster/login" className="btn btn-outline-secondary">Back to login</Link>
                </div>
              </form>
        </div>
      </div>
    </Layout>
  );
}
