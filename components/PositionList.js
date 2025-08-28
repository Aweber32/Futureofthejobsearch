import Link from 'next/link';

export default function PositionList({ positions = [] }){
  if (!positions || positions.length === 0) return (<p className="text-muted">No positions posted yet.</p>);

  return (
    <div>
      {positions.map((p) => (
        <div key={p.id} className="card mb-2">
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <h5 className="card-title mb-0">{p.title}</h5>
            </div>
            <div className="d-flex gap-2">
              <Link href={`/poster/dashboard/edit-position/${p.id}`} className="btn btn-sm btn-outline-primary">Edit</Link>
              <Link href={`/poster/find-candidates?positionId=${p.id}`} className="btn btn-sm btn-success">Find Candidates</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
