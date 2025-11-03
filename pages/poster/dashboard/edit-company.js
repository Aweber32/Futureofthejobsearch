import Link from 'next/link';
import Layout from '../../../components/Layout';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { State, City } from 'country-state-city';
import { useRouter } from 'next/router';
import { API_CONFIG } from '../../../config/api';
import { signBlobUrl } from '../../../utils/blobHelpers';

const API = API_CONFIG.BASE_URL;

export default function EditCompany(){
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: '', contactName: '', contactEmail: '', website: '', companyDescription: '', companySize: 'Small', address: '', city: '', state: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employerId, setEmployerId] = useState(null);

  useEffect(()=>{
    const states = State.getStatesOfCountry('US').map(s=>({ value: s.isoCode, label: s.name }));
    setStateOptions(states);

    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { router.push('/poster/login'); return; }

    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>r.ok? r.json() : Promise.reject('Unauthorized'))
      .then(async data=>{
          if (!data.employer) { router.push('/poster/login'); return; }
          const emp = data.employer;
          setEmployerId(emp.id);
          
          // Sign and store logo URL if available
          if (emp.logoUrl) {
            const signedUrl = await signBlobUrl(emp.logoUrl, token);
            setCurrentLogoUrl(signedUrl);
          }
          
          // server returns CompanySize as enum number; convert to name string expected by API
          const sizeToName = (v) => {
            if (v === null || v === undefined) return 'Small';
            if (typeof v === 'string') return v;
            if (typeof v === 'number') {
              if (v === 0) return 'Small';
              if (v === 1) return 'Medium';
              if (v === 2) return 'Large';
              return 'Small';
            }
            return String(v);
          };
          setForm({ companyName: emp.companyName || '', contactName: emp.contactName || '', contactEmail: emp.contactEmail || '', website: emp.website || '', companyDescription: emp.companyDescription || '', companySize: sizeToName(emp.companySize), address: emp.address || '', city: emp.city || '', state: emp.state || '' });
        })
      .catch(()=>router.push('/poster/login'));
  },[]);

  useEffect(()=>{
    if (form.state) {
      const cities = City.getCitiesOfState('US', form.state).map(c=>({ value: c.name, label: c.name }));
      setCityOptions(cities);
    } else setCityOptions([]);
  },[form.state]);

  async function save(e){
    e.preventDefault();
    setError('');
    if (!form.companyName) { setError('Company name is required'); return; }
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    try{
      // update employer
      const res = await fetch(`${API}/api/employers/${employerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ CompanyName: form.companyName, Website: form.website, ContactName: form.contactName, ContactEmail: form.contactEmail, CompanyDescription: form.companyDescription, CompanySize: form.companySize, Address: form.address, City: form.city, State: form.state })
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Update employer failed', res.status, txt);
        throw new Error(txt || `Update failed (${res.status})`);
      }

      // optionally upload new logo
      if (logoFile && employerId){
        const formData = new FormData(); formData.append('file', logoFile, logoFile.name);
        const up = await fetch(`${API}/api/uploads/logo`, { method: 'POST', body: formData });
        if (!up.ok) {
          const upTxt = await up.text();
          console.error('Logo upload failed', up.status, upTxt);
          throw new Error(upTxt || `Logo upload failed (${up.status})`);
        }
        const upData = await up.json();
        if (upData?.url){
          const p = await fetch(`${API}/api/employers/${employerId}/logo`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ LogoUrl: upData.url }) });
          if (!p.ok) {
            const pTxt = await p.text();
            console.error('Saving logo URL failed', p.status, pTxt);
            throw new Error(pTxt || `Saving logo URL failed (${p.status})`);
          }
        }
      }

      router.push('/poster/dashboard');
    }catch(err){ console.error(err); setError(err?.message || 'Update failed'); }
    finally{ setLoading(false); }
  }

  return (
    <Layout title="Edit company">
      <div className="d-flex justify-content-between align-items-center">
        <h2>Edit company</h2>
      </div>

      <form className="mt-3" onSubmit={save}>
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
            {currentLogoUrl && (
              <button 
                type="button" 
                className="btn btn-link btn-sm ps-0 mt-1" 
                onClick={() => setShowLogoModal(true)}
              >
                View Logo
              </button>
            )}
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Contact name</label>
            <input className="form-control" value={form.contactName} onChange={e=>setForm({...form, contactName: e.target.value})} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Contact email</label>
            <input className="form-control" value={form.contactEmail} onChange={e=>setForm({...form, contactEmail: e.target.value})} />
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading? 'Saving…' : 'Save'}</button>
          <Link href="/poster/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>

      {/* Logo Preview Modal */}
      {showLogoModal && (
        <div 
          className="modal show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowLogoModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Company Logo</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowLogoModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body text-center">
                {currentLogoUrl ? (
                  <img 
                    src={currentLogoUrl} 
                    alt="Company Logo" 
                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                  />
                ) : (
                  <p className="text-muted">No logo uploaded</p>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowLogoModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
