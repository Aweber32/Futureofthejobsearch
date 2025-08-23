import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import CompanyCard from '../../../components/CompanyCard';
import PositionList from '../../../components/PositionList';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Dashboard(){
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [positions, setPositions] = useState([]);

  useEffect(()=>{
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) { router.push('/poster/login'); return; }

    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>r.ok? r.json() : Promise.reject('Unauthorized'))
      .then(async data=>{
        if (!data.employer) { setCompany(null); setPositions([]); return; }
        const emp = data.employer;
        let logo = emp.logoUrl;
        // If we have a logo path/url stored, request an on-demand SAS URL
        if (logo) {
          try {
            const res = await fetch(`${API}/api/employers/${emp.id}/logo-sas`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok){
              const body = await res.json();
              if (body?.url) logo = body.url;
            }
          } catch (e) {
            // ignore and fall back to stored logo
            console.warn('Failed to fetch logo SAS', e);
          }
        }

        setCompany({ name: emp.companyName, logo, description: emp.companyDescription });
        // TODO: fetch positions for employer from API when available
        setPositions([]);
      })
      .catch(()=>router.push('/poster/login'));
  },[]);

  return (
    <Layout title="Dashboard">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1>Dashboard</h1>
          <CompanyCard company={company || { name: 'Acme Co', logo: '/logo.svg', description: 'Company profile' }} />
        </div>
        <div>
          <Link href="/poster/dashboard/edit-company" className="btn btn-outline-secondary me-2">Edit company</Link>
          <Link href="/poster/login" className="btn btn-outline-danger">Logout</Link>
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
