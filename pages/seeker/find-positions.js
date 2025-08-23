import Link from 'next/link';
import Layout from '../../components/Layout';

const MOCK = [
  { id: '1', title: 'Frontend Engineer', headline: 'React, TypeScript' },
  { id: '2', title: 'Backend Engineer', headline: 'Node.js, APIs' },
  { id: '3', title: 'Product Manager', headline: 'SaaS product' }
]

export default function FindPositions(){
  return (
    <Layout title="Find positions">
      <h2>Find positions</h2>
      <p className="text-muted">Review positions sequentially and mark your interest.</p>

      <div className="row">
        {MOCK.map(p => (
          <div className="col-md-6" key={p.id}>
            <div className="card mb-3">
              <div className="card-body d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-semibold">{p.title}</div>
                  <div className="text-muted">{p.headline}</div>
                </div>
                <div className="d-flex gap-2">
                  <Link href={`/seeker/position/${p.id}`} className="btn btn-outline-primary">View</Link>
                  <button className="btn btn-success">Mark Interested</button>
                  <button className="btn btn-outline-secondary">Pass</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
