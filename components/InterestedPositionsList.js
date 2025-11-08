import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, FileSearch } from 'lucide-react';
import { motion } from 'framer-motion';
import PositionReviewModal from './PositionReviewModal';
import ChatButton from './ChatButton';
import { API_CONFIG } from '../config/api';

const API = API_CONFIG.BASE_URL;

export default function InterestedPositionsList({ seeker }){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePosition, setActivePosition] = useState(null);
  const [token, setToken] = useState(null);
  const [fetchingPosition, setFetchingPosition] = useState(false);

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

        // Some APIs return a nested position object without the related Employer navigation property.
        // For those items, re-fetch the full position (which includes Employer via server Include) so we can reliably derive company name.
        const enriched = await Promise.all(withStatus.map(async it => {
          try{
            if (it.position && !it.position.employer && it.id) {
              const pres = await fetch(`${API}/api/positions/${it.id}`, { headers: { Authorization: `Bearer ${authToken}` } });
              if (pres.ok) {
                const pjson = await pres.json();
                return { ...it, position: pjson, title: pjson.title ?? it.title };
              }
            }
          }catch{}
          return it;
        }));

        // Fetch conversations once and attach unreadCount to items
        let enrichedWithUnread = enriched;
        try{
          const cres = await fetch(`${API}/api/conversations`, { headers: { Authorization: `Bearer ${authToken}` } });
          if (cres.ok){
            const convs = await cres.json();
            const map = {};
            (convs || []).forEach(c => {
              const posId = c.positionId ?? c.PositionId ?? '';
              const parts = c.participantUserIds || c.ParticipantUserIds || [];
              parts.forEach(uid => {
                const key = `${posId}|${uid}`;
                map[key] = Math.max(map[key] || 0, c.unreadCount || c.UnreadCount || 0);
              });
            });
            enrichedWithUnread = enriched.map(it => {
              const otherUserId = it.position?.employer?.userId || it.position?.employer?.UserId || it.raw?.posterUserId || null;
              const pid = it.id || it.position?.id || it.position?.Id || null;
              const unread = (pid && otherUserId) ? (map[`${pid}|${otherUserId}`] || 0) : 0;
              return { ...it, unreadCount: unread };
            });
          }
        }catch{ /* ignore */ }

        setItems(enrichedWithUnread);
      }catch(err){ setError(err?.message || 'Failed to load'); }
      finally{ setLoading(false); }
    })();
  },[seeker]);

  if (loading) return <div className="text-center py-5" style={{color: '#6b7280'}}>Loading interested positions…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!items.length) return (
    <div className="text-center py-5">
      <p style={{color: '#6b7280', marginBottom: '1rem'}}>No interested positions yet.</p>
      <Link href="/seeker/find-positions" className="btn btn-primary" style={{borderRadius: '8px'}}>
        Find Positions
      </Link>
    </div>
  );

  return (
    <div className="row g-4">
      {items.map((item, index) => (
        <motion.div 
          key={item.id || JSON.stringify(item.raw)} 
          className="col-12 col-lg-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <div 
            className="card h-100 border-0 shadow-sm" 
            style={{
              borderRadius: '12px',
              borderTop: '3px solid #6E56CF',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex flex-column gap-3">
                {/* Title and Company */}
                <div>
                  <h5 className="mb-2" style={{fontSize: '1.125rem', fontWeight: '600', color: '#111827'}}>
                    {item.title || 'Position'}
                  </h5>
                  {(item.position?.employer?.companyName || item.position?.companyName) && (
                    <p className="mb-0" style={{fontSize: '14px', color: '#6b7280'}}>
                      {item.position?.employer?.companyName || item.position?.companyName}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                {(() => {
                  const raw = item.posterStatus ?? 'Job-Poster Status: Unreviewed';
                  const ps = raw.replace('Not-Intrested', 'Not-Interested');
                  const psLower = ps.toLowerCase();
                  
                  let badgeClass = 'bg-secondary bg-opacity-10 text-secondary';
                  let displayText = 'Unreviewed';
                  
                  if (psLower.includes('not-interested')) {
                    badgeClass = 'bg-danger bg-opacity-10 text-danger';
                    displayText = 'Not Interested';
                  } else if (psLower.includes('interested')) {
                    badgeClass = 'bg-success bg-opacity-10 text-success';
                    displayText = 'Interested';
                  }
                  
                  return (
                    <div>
                      <span 
                        className={`badge ${badgeClass}`}
                        style={{
                          borderRadius: '9999px',
                          padding: '0.375rem 0.75rem',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Employer: {displayText}
                      </span>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="d-flex gap-2 mt-2">
                  {(() => {
                    const tryVals = [
                      item.position?.companyName,
                      item.position?.company,
                      item.position?.employer?.companyName,
                      item.position?.employer?.name,
                      item.position?.company?.name,
                      item.position?.company?.companyName,
                      item.raw?.position?.companyName,
                      item.raw?.position?.employer?.name,
                      item.raw?.companyName,
                      item.raw?.company,
                      item.raw?.employer?.companyName,
                      item.raw?.employer?.name
                    ];
                    const found = tryVals.find(v => v && typeof v === 'string' && v.trim().length > 0);
                    const companyName = found ? found.trim() : 'Unknown company';
                    const positionTitle = item.position?.title ?? item.title ?? 'Position Conversation';
                    const otherUserId = (
                      item.position?.employer?.userId ||
                      item.position?.employer?.UserId ||
                      item.raw?.employer?.userId ||
                      item.raw?.employer?.UserId ||
                      item.raw?.posterUserId ||
                      null
                    );
                    const posId = item.id || item.position?.id || item.position?.Id || null;
                    
                    return <ChatButton title={positionTitle} subtitle={companyName} otherUserId={otherUserId} positionId={posId} unreadCount={item.unreadCount || 0} />;
                  })()}
                  
                  <button
                    onClick={async ()=> {
                      // Always fetch fresh complete data from the API
                      setFetchingPosition(true);
                      try {
                        const pres = await fetch(`${API}/api/positions/${item.id}`, { 
                          headers: { Authorization: `Bearer ${token}` } 
                        });
                        
                        if (pres.ok) {
                          const freshData = await pres.json();
                          console.log('✅ Fetched fresh position data:', freshData);
                          setActivePosition(freshData);
                        } else {
                          console.error('❌ Failed to fetch position:', pres.status);
                          // Fallback to existing data if fetch fails
                          setActivePosition(item.position ?? {
                            id: item.id,
                            title: item.title,
                            description: item.position?.description ?? 'No description available',
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
                        }
                      } catch (error) {
                        console.error('❌ Error fetching position data:', error);
                        // Fallback to existing data on error
                        setActivePosition(item.position ?? {
                          id: item.id,
                          title: item.title,
                          description: item.position?.description ?? 'No description available',
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
                      } finally {
                        setFetchingPosition(false);
                      }
                    }}
                    className="btn btn-outline-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                    disabled={fetchingPosition}
                    style={{
                      borderRadius: '8px',
                      padding: '0.625rem 1rem',
                      fontSize: '14px',
                      fontWeight: '500',
                      borderColor: '#6E56CF',
                      color: fetchingPosition ? '#9ca3af' : '#6E56CF',
                      transition: 'all 0.2s ease',
                      opacity: fetchingPosition ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!fetchingPosition) {
                        e.currentTarget.style.backgroundColor = '#6E56CF';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!fetchingPosition) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#6E56CF';
                      }
                    }}
                  >
                    <FileSearch size={16} />
                    {fetchingPosition ? 'Loading...' : 'Review Position'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      {activePosition && (
        <PositionReviewModal 
          position={activePosition} 
          onClose={()=>setActivePosition(null)}
          onNotInterested={(pos)=>{
            const pid = pos?.id ?? pos?.Id ?? pos?.positionId ?? pos?.PositionId;
            if (pid != null) {
              setItems(curr => curr.filter(it => {
                const itId = it.id ?? it.Id ?? it.positionId ?? it.PositionId;
                return String(itId) !== String(pid);
              }));
            }
            setActivePosition(null);
          }}
        />
      )}
    </div>
  );
}
