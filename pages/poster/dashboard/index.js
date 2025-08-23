import Link from 'next/link';
import Layout from '../../../components/Layout';
import CompanyCard from '../../../components/CompanyCard';
import PositionList from '../../../components/PositionList';

const MOCK = {
  company: { name: 'Acme Co', logo: '/logo.svg' },
  positions: [
    { id: '1', title: 'Frontend Engineer', location: 'Remote', type: 'Full-time' },
    { id: '2', title: 'Product Manager', location: 'NYC', type: 'Full-time' }
  ]
}

export default function Dashboard(){
  return (
    <Layout title="Dashboard">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1>Dashboard</h1>
          <CompanyCard company={MOCK.company} />
        </div>
        <div>
          <Link href="/poster/dashboard/edit-company" className="btn btn-outline-secondary me-2">Edit company</Link>
          <Link href="/" className="btn btn-outline-danger">Logout</Link>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <h4>Posted positions</h4>
          <PositionList positions={MOCK.positions} />
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
