import Link from 'next/link';

export default function PositionList({ positions = [] }){
  if (!positions || positions.length === 0) return (<p className="text-muted">No positions posted yet.</p>);

  return (
    <div>
      {positions.map((p) => {
        const isOpen = (p.isOpen ?? p.IsOpen) !== undefined ? (p.isOpen ?? p.IsOpen) : true;
        return (
          <div key={p.id} className="card mb-2">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h5 className="card-title mb-0">
                  {p.title}
                  {isOpen ? (
                    <span className="badge bg-success ms-2">Active</span>
                  ) : (
                    <span className="badge bg-secondary ms-2">Closed</span>
                  )}
                </h5>
              </div>
              <div className="d-flex gap-2">
                <Link href={`/poster/position/${p.id}/candidates`} className="btn btn-sm btn-outline-secondary">View Canadiates</Link>
                <Link href={`/poster/dashboard/edit-position/${p.id}`} className="btn btn-sm btn-outline-primary">Edit</Link>
                {isOpen ? (
                  <Link href={`/poster/find-candidates?positionId=${p.id}`} className="btn btn-sm btn-success">Find Candidates</Link>
                ) : (
                  <button type="button" className="btn btn-sm btn-success" disabled>Find Candidates</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
