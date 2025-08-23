import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';

const MOCK = {
  position: { title: 'Frontend Engineer', location: 'Remote', type: 'Full-time', description: 'Build delightful UIs' },
  status: 'Interested'
}

export default function SeekerPosition(){
  const router = useRouter();
  const { id } = router.query;
  return (
    <Layout title={`Position ${id}`}>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <h2 className="mb-0">{MOCK.position.title}</h2>
          <p className="text-muted mb-1">Status: <strong>{MOCK.status}</strong></p>
          <p className="text-muted mb-1">{MOCK.position.location} • {MOCK.position.type}</p>
        </div>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => router.back()}>Back</button>
          <Link href="/seeker/find-positions" className="btn btn-primary">Find Positions</Link>
        </div>
      </div>

      <p className="mt-3">{MOCK.position.description}</p>

      <div className="mt-4">
        <button className="btn btn-outline-danger">No longer interested (placeholder)</button>
      </div>
    </Layout>
  )
}
