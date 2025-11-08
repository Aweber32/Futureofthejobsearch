import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import Layout from '../../../components/Layout';

// Maps employer review interest to display label & style
function mapInterestStatus(interestRecord){
  if (!interestRecord) return { label: 'Un-reviewed', variant: 'secondary' };
  if (interestRecord.Interested === true || interestRecord.interested === true) return { label: 'Interested', variant: 'success' };
  if (interestRecord.Interested === false || interestRecord.interested === false) return { label: 'Not-Interested', variant: 'danger' };
  return { label: 'Un-reviewed', variant: 'secondary' };
}

export default function PositionPage(){
  const router = useRouter();
  const { id } = router.query;
  const [position, setPosition] = useState(null);
  const [interests, setInterests] = useState([]); // Employer SeekerInterests list (employer reviews)
  const [candidateInterests, setCandidateInterests] = useState([]); // Candidate self-declared PositionInterests (Interested=true)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const base = typeof window !== 'undefined' ? (window.__ENV?.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000') : 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;

      // Fetch position (public-ish; employer auth may return full object)
      const posRes = await fetch(`${base}/api/positions/${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!posRes.ok){ throw new Error(await posRes.text() || 'Failed to load position'); }
      const posData = await posRes.json();
      setPosition(posData);

      // Fetch employer seeker interests for this position (employer-only)
      if (token){
        const interestRes = await fetch(`${base}/api/seekerinterests?positionId=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (interestRes.ok){
          const interestData = await interestRes.json();
          setInterests(Array.isArray(interestData) ? interestData : []);
          try { console.debug('[pipeline] employer reviews count:', Array.isArray(interestData) ? interestData.length : 0); } catch {}
        } else if (interestRes.status === 403){
          // Employer mismatch
          setInterests([]);
        }

        // Fetch candidate position interests (who raised their hand) for this position
        const candRes = await fetch(`${base}/api/positioninterests/for-position?positionId=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (candRes.ok){
          const candData = await candRes.json();
          setCandidateInterests(Array.isArray(candData) ? candData : []);
          try { console.debug('[pipeline] candidate self-interests count:', Array.isArray(candData) ? candData.length : 0); } catch {}
        }
      }
    } catch (e){
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  },[id]);

  useEffect(()=>{ loadData(); },[loadData]);

  return (
    <Layout title={position ? position.title : `Position ${id}`}>      
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <h2 className="mb-0 me-3">{position?.title || 'Loading…'}</h2>
            <Link href="/poster/find-candidates" className="btn btn-success">Find Candidates</Link>
          </div>
          {position && (
            <p className="text-muted mb-1 mt-2">{position.workSetting || position.location || 'Location TBD'} • {position.employmentType || position.type || 'Employment Type'}</p>
          )}
        </div>
        <div>
          <button onClick={() => router.back()} className="btn btn-outline-secondary">Back</button>
        </div>
      </div>
      {position && position.description && <p className="mt-3" style={{whiteSpace:'pre-wrap'}}>{position.description}</p>}

      <div className="my-4">
        <h5 className="d-flex align-items-center gap-2 mb-3">Interested Candidates
          <small className="text-muted">(Employer review states)</small>
        </h5>
        {loading && <div className="text-muted">Loading candidates…</div>}
        {error && !loading && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        {!loading && !error && (
          <div className="list-group">
            {(() => {
              // Merge candidateInterests (self-declared) with employer review interests.
              // Key by seekerId
              const employerMap = new Map();
              interests.forEach(ir => {
                const seekerObj = ir.seeker || ir.Seeker || {};                
                const seekerId = seekerObj.id || seekerObj.Id;
                if (seekerId) employerMap.set(seekerId, ir);
              });
              const combined = [];
              // Include all candidate self interests
              candidateInterests.forEach(ci => {
                const seekerObj = ci.seeker || ci.Seeker || {};
                const seekerId = seekerObj.id || seekerObj.Id;
                if (!seekerId) return;
                const employerReview = employerMap.get(seekerId);
                combined.push({ seeker: seekerObj, employerReview, candidateInterest: ci });
                employerMap.delete(seekerId);
              });
              // Add any remaining employer-only reviews (maybe added manually later)
              employerMap.forEach((ir, seekerId) => {
                const seekerObj = ir.seeker || ir.Seeker || {};
                combined.push({ seeker: seekerObj, employerReview: ir, candidateInterest: null });
              });

              if (combined.length === 0) {
                return <div className="list-group-item text-muted">No interested candidates yet</div>;
              }

              return combined.map(row => {
                const seeker = row.seeker || {};
                const firstName = seeker.firstName || seeker.FirstName || '';
                const lastName = seeker.lastName || seeker.LastName || '';
                const fullName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Job Seeker';
                const status = mapInterestStatus(row.employerReview); // employer review status
                const candidateRaisedHand = !!row.candidateInterest;  // self-declared interest
                return (
                  <div key={seeker.id || seeker.Id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold d-flex flex-wrap align-items-center gap-2">
                        <span>{fullName}</span>
                        {candidateRaisedHand && <span className="badge bg-info text-dark">Candidate Interested</span>}
                        <span className={`badge bg-${status.variant}`}>{status.label}</span>
                      </div>
                      {seeker.headline && <small className="text-muted d-block">{seeker.headline}</small>}
                    </div>
                    <div className="d-flex gap-2">
                      <Link href={`/poster/candidate/${seeker.id || seeker.Id || ''}`} className="btn btn-outline-primary btn-sm">View Profile</Link>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </Layout>
  );
}
