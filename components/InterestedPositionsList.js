import { useEffect, useState } from 'react';
import Link from 'next/link';
import PositionReviewModal from './PositionReviewModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function InterestedPositionsList({ seeker }){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePosition, setActivePosition] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(()=>{
    if (!seeker) return;
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!authToken) { setError('Not authenticated'); setLoading(false); return; }
    setToken(authToken);

    (async ()=>{
      try{
        // fetch all position interests for the current seeker
        const res = await fetch(`${API}/api/positioninterests`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok) throw new Error('Failed to load interests');
        const data = await res.json();
        // filter for this seeker and interested=true
        const my = (data || []).filter(i => (i.seekerId === seeker.id || i.seekerId === seeker.SeekerId || i.seekerId === seeker.seekerId) && i.interested === true);

        // try to normalize position details: some APIs may include a nested position
        const normalized = await Promise.all(my.map(async i => {
          if (i.position) return { id: i.position.id ?? i.position.Id ?? i.position.positionId, title: i.position.title ?? i.position.Title ?? i.position.jobTitle, raw: i, position: i.position };
          // otherwise fetch basic position data
          try{
            const pres = await fetch(`${API}/api/positions/${i.positionId ?? i.positionID ?? i.PositionId}`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (pres.ok) {
              const pjson = await pres.json();
              console.log('✅ Fetched position data from API:', pjson);
              console.log('🏢 API position employer:', pjson.employer);
              console.log('📚 API position educations:', pjson.educations);
              console.log('📚 API position experiences:', pjson.experiences);
              console.log('📚 API position skillsList:', pjson.skillsList);
              return { id: pjson.id ?? pjson.Id, title: pjson.title ?? pjson.Title ?? pjson.jobTitle ?? pjson.positionTitle, raw: i, position: pjson };
            }
          }catch{}
          return { id: i.positionId ?? i.PositionId ?? i.positionID, title: i.positionTitle ?? 'Position', raw: i };
        }));

        // For each normalized item, fetch poster-side SeekerInterest to determine employer's decision
        const withStatus = await Promise.all(normalized.map(async it => {
          try{
            const pid = it.id;
            if (!pid) return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
            const sres = await fetch(`${API}/api/seekerinterests?positionId=${pid}`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (!sres.ok) return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
            const slist = await sres.json();
            // find record for this seeker
            const match = (slist || []).find(si => si.seekerId === seeker.id || si.SeekerId === seeker.SeekerId || si.seekerId === seeker.seekerId || si.SeekerId === seeker.id);
            if (!match) return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
            const status = match.interested === true ? 'Job-Poster Status: Interested' : 'Job-Poster Status: Not-Interested';
            return { ...it, posterStatus: status };
          }catch{
            return { ...it, posterStatus: 'Job-Poster Status: Unreviewed' };
          }
        }));

        setItems(withStatus);
      }catch(err){ setError(err?.message || 'Failed to load'); }
      finally{ setLoading(false); }
    })();
  },[seeker]);

  if (loading) return <div>Loading interested positions…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!items.length) return <div>No interested positions yet. Use <Link href="/seeker/find-positions">Find Positions</Link> to swipe.</div>;

  return (
    <div className="list-group">
      {items.map(item => (
        <div key={item.id || JSON.stringify(item.raw)} className="list-group-item">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start">
            <div className="flex-grow-1 mb-2 mb-sm-0">
              <div className="fw-bold h6 mb-1">{item.title || 'Position'}</div>
              {item.position?.companyName && <div className="text-muted small">{item.position.companyName}</div>}
            </div>
            <div className="w-100 w-sm-auto">
              {(() => {
                const raw = item.posterStatus ?? 'Job-Poster Status: Unreviewed';
                const ps = raw.replace('Not-Intrested', 'Not-Interested');
                const psLower = ps.toLowerCase();
                // badge classes: green = interested, dark gray = not-interested, gray = unreviewed
                let badgeClass = 'bg-secondary text-white';
                if (psLower.includes('not-interested')) badgeClass = 'bg-dark text-white';
                else if (psLower.includes('interested')) badgeClass = 'bg-success text-white';
                return (
                  <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
                    <span className={`badge ${badgeClass} text-center`} style={{borderRadius: '0.75rem', padding: '0.5rem 0.75rem'}}>{ps}</span>
                    <button
                      onClick={async ()=> {
                        console.log('🎯 Review Position clicked for item:', item);
                        console.log('📋 Item position data:', item.position);
                        console.log('🏢 Item position employer:', item.position?.employer);
                        console.log('📚 Item position educations:', item.position?.educations);
                        console.log('📚 Item position experiences:', item.position?.experiences);
                        console.log('📚 Item position skillsList:', item.position?.skillsList);

                        let positionToShow = item.position;

                        // If position data exists but is missing key information, try to re-fetch
                        if (positionToShow && (!positionToShow.employer || !positionToShow.educations || !positionToShow.experiences || !positionToShow.skillsList)) {
                          console.log('🔄 Re-fetching position data because key information is missing');
                          try {
                            const pres = await fetch(`${API}/api/positions/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
                            if (pres.ok) {
                              const freshData = await pres.json();
                              console.log('✅ Re-fetched position data:', freshData);
                              positionToShow = freshData;
                            }
                          } catch (error) {
                            console.error('❌ Failed to re-fetch position data:', error);
                          }
                        }

                        setActivePosition(positionToShow ?? {
                          id: item.id,
                          title: item.title,
                          description: item.position?.description ?? item.raw?.description ?? 'No description available',
                          employer: item.position?.employer ?? null,
                          educations: item.position?.educations ?? [],
                          experiences: item.position?.experiences ?? [],
                          skillsList: item.position?.skillsList ?? [],
                          salaryMin: item.position?.salaryMin ?? null,
                          salaryMax: item.position?.salaryMax ?? null,
                          salaryType: item.position?.salaryType ?? 'None',
                          workSetting: item.position?.workSetting ?? 'Not specified',
                          travelRequirements: item.position?.travelRequirements ?? 'None'
                        });
                      }}
                      className="btn btn-sm btn-outline-primary flex-grow-1 flex-sm-grow-0"
                      style={{minHeight: '38px'}}
                    >
                      Review Position
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ))}
      {activePosition && <PositionReviewModal position={activePosition} onClose={()=>setActivePosition(null)} />}
    </div>
  );
}
