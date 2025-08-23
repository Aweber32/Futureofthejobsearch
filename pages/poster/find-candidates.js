import Link from 'next/link';
import Layout from '../../components/Layout';

const MOCK = [
  { id: 'c1', name: 'Alex Smith', headline: 'Frontend engineer — React' },
  { id: 'c2', name: 'Sam Jones', headline: 'Full-stack developer' }
]

export default function FindCandidates(){
  return (
    <Layout title="Find candidates">
      <h2>Candidate review</h2>
      <p className="text-muted">Review profiles and mark interest</p>

      <div className="row">
        {MOCK.map(c => (
          <div className="col-md-6" key={c.id}>
            <div className="card mb-3">
              <div className="card-body d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-semibold">{c.name}</div>
                  <div className="text-muted">{c.headline}</div>
                </div>
                <div className="d-flex gap-2">
                  <Link href="#" className="btn btn-outline-primary">View Profile</Link>
                  <button className="btn btn-success">Mark Interested</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
