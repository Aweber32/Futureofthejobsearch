import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import CompanyCard from '../../../components/CompanyCard';
import PositionList from '../../../components/PositionList';
import { API_CONFIG } from '../../../config/api';
import { signBlobUrl } from '../../../utils/blobHelpers';

const API = API_CONFIG.BASE_URL;

export default function Dashboard(){
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [positions, setPositions] = useState([]);
  const [userEmail, setUserEmail] = useState('');

  useEffect(()=>{
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { router.push('/poster/login'); return; }

    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>r.ok? r.json() : Promise.reject('Unauthorized'))
      .then(async data=>{
        // Store user email for dropdown
        setUserEmail(data.user?.email || '');
        
        if (!data.employer) { setCompany(null); setPositions([]); return; }
        const emp = data.employer;
        let logo = emp.logoUrl;
        // Sign the logo URL if it's a path-only reference
        if (logo) {
          logo = await signBlobUrl(logo, token);
        }

        setCompany({ name: emp.companyName, logo, description: emp.companyDescription });
        // fetch positions for this employer and set into state
        try {
          const posRes = await fetch(`${API}/api/positions`, { headers: { Authorization: `Bearer ${token}` } });
          if (posRes.ok){
            const all = await posRes.json();
            // filter positions that belong to this employer
            const myPositions = all.filter(p => p.employerId === emp.id || (p.employer && p.employer.id === emp.id));
            setPositions(myPositions);
          } else {
            setPositions([]);
          }
        } catch (e) {
          console.warn('Failed to fetch positions', e);
          setPositions([]);
        }
      })
      .catch(()=>router.push('/poster/login'));
  },[]);

  async function logout(){
    const token = localStorage.getItem('fjs_token');
    try{
      await fetch(`${API}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    }catch{}
    localStorage.removeItem('fjs_token');
    router.push('/poster/login');
  }

  return (
    <Layout title="Dashboard">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1>Dashboard</h1>
          <CompanyCard company={company || { name: 'Acme Co', logo: '/logo.svg', description: 'Company profile' }} />
        </div>
        <div className="dropdown">
          <button className="btn btn-outline-secondary dropdown-toggle" type="button" id="accountDropdown" data-bs-toggle="dropdown" aria-expanded="false">
            Account
          </button>
          <ul className="dropdown-menu" aria-labelledby="accountDropdown">
            <li><span className="dropdown-item-text text-muted small">{userEmail}</span></li>
            <li><hr className="dropdown-divider" /></li>
            <li><Link href="/poster/dashboard/edit-company" className="dropdown-item">Edit Company</Link></li>
            <li><span className="dropdown-item">Billing</span></li>
            <li><button className="dropdown-item text-danger" onClick={logout}>Logout</button></li>
          </ul>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <h4>Posted positions</h4>
          <PositionList positions={positions} />
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h5>Create a new position</h5>
            <p className="text-muted">Create a role to start finding candidates</p>
            <Link href="/poster/dashboard/create-position" className="btn btn-primary">Create position</Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
