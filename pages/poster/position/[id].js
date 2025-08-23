import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';

const MOCK = {
  position: { title: 'Frontend Engineer', location: 'Remote', type: 'Full-time', description: 'Build delightful UIs' },
  candidates: [
    { id: 'c1', name: 'Alex Smith' },
    { id: 'c2', name: 'Sam Jones' }
  ]
}

export default function PositionPage(){
  const router = useRouter();
  const { id } = router.query;
  return (
    <Layout title={`Position ${id}`}>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="d-flex align-items-center">
            <h2 className="mb-0 me-3">{MOCK.position.title}</h2>
            <Link href="/poster/find-candidates" className="btn btn-success">Find Candidates</Link>
          </div>
          <p className="text-muted mb-1 mt-2">{MOCK.position.location} • {MOCK.position.type}</p>
        </div>
        <div>
          <button onClick={() => router.back()} className="btn btn-outline-secondary">Back</button>
        </div>
      </div>
      <p className="mt-3">{MOCK.position.description}</p>

      <div className="my-4">
        <h5>Interested candidates</h5>
        <div className="list-group">
          {MOCK.candidates.map(c => (
            <div key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-semibold">{c.name}</div>
                <small className="text-muted">Applied — placeholder</small>
              </div>
              <div className="d-flex gap-2">
                <Link href="#" className="btn btn-outline-primary">View Profile</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
