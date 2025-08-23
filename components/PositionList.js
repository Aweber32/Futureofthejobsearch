import Link from 'next/link';

export default function PositionList({ positions = [] }){
  return (
    <div>
      {positions.map((p) => (
        <div key={p.id} className="card mb-3">
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <h5 className="card-title mb-1">{p.title}</h5>
              <p className="mb-0 text-muted">{p.location} • {p.type}</p>
            </div>
            <div className="d-flex gap-2">
              <Link href={`/poster/position/${p.id}`} className="btn btn-outline-primary">View</Link>
              <Link href={`/poster/dashboard/edit-position/${p.id}`} className="btn btn-secondary">Edit Position</Link>
              <Link href={`/poster/find-candidates`} className="btn btn-success">Find Candidates</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
