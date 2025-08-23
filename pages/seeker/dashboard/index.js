import Link from 'next/link';
import Layout from '../../../components/Layout';

const MOCK = {
  user: { name: 'Alex Seeker' },
  interested: [
    { id: '1', title: 'Frontend Engineer', status: 'Interested' },
    { id: '2', title: 'Product Manager', status: 'Un-reviewed' },
    { id: '3', title: 'DevOps Engineer', status: 'Position Closed' }
  ]
}

export default function SeekerDashboard(){
  return (
    <Layout title="Dashboard">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1>Welcome, {MOCK.user.name}</h1>
        </div>
        <div className="d-flex gap-2">
          <Link href="/seeker/edit-profile" className="btn btn-outline-secondary">Edit profile</Link>
          <Link href="/" className="btn btn-outline-danger">Logout</Link>
        </div>
      </div>

      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h4>Interested positions</h4>
        <Link href="/seeker/find-positions" className="btn btn-primary">Find Positions</Link>
      </div>

      <div>
        {MOCK.interested.map(p => (
          <div key={p.id} className="card mb-3">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="h5 mb-1">{p.title}</div>
                <div><strong>Status:</strong> <span className="text-muted">{p.status}</span></div>
              </div>
              <div className="d-flex gap-2">
                <Link href={`/seeker/position/${p.id}`} className="btn btn-outline-primary">View position</Link>
              </div>
            </div>
          </div>
        ))}
      </div>

    </Layout>
  )
}
