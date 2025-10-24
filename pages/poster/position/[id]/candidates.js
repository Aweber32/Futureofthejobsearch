import Layout from '../../../../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { API_CONFIG } from '../../../../config/api';
import ChatButton from '../../../../components/ChatButton';

export default function PositionCandidates(){
  const router = useRouter();
  const { id } = router.query;
  const [interestedList, setInterestedList] = useState([]);
  const [notInterestedList, setNotInterestedList] = useState([]);
  const [positionTitle, setPositionTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [convUnreadMap, setConvUnreadMap] = useState({});
  const saveTimeoutRef = useRef(null);

  useEffect(()=>{
    if (!id) return;
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
        const res = await fetch(`${base}/api/seekerinterests?positionId=${id}`);
        if (!res.ok) { 
          setInterestedList([]);
          setNotInterestedList([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        
        // Fetch position title
        try{
          const pres = await fetch(`${base}/api/positions/${id}`);
          if (pres.ok){
            const pjson = await pres.json();
            setPositionTitle(pjson.title ?? pjson.Title ?? pjson.positionTitle ?? '');
          }
        }catch(e){ /* ignore */ }
        
        if (!cancelled) {
          // Split into interested and not interested, preserving order from server (already ranked)
          const interested = (data || []).filter(r => r.interested || r.Interested);
          const notInterested = (data || []).filter(r => !(r.interested || r.Interested));
          setInterestedList(interested);
          setNotInterestedList(notInterested);

          // Fetch conversations once to compute unread counts for ChatButtons
          try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
            if (token) {
              const cres = await fetch(`${base}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
              if (cres.ok) {
                const convs = await cres.json();
                // Build a map keyed by `${positionId}|${otherUserId}`
                const map = {};
                (convs || []).forEach(c => {
                  const keyBase = `${c.positionId ?? c.PositionId ?? ''}|`;
                  const parts = c.participantUserIds || c.ParticipantUserIds || [];
                  parts.forEach(uid => {
                    const key = keyBase + uid;
                    // Store highest unread (binary at the moment) per key
                    map[key] = Math.max(map[key] || 0, c.unreadCount || c.UnreadCount || 0);
                  });
                });
                setConvUnreadMap(map);
              }
            }
          } catch (e) {
            // ignore conv fetch errors to avoid blocking page
          }

          setLoading(false);
        }
      }catch(e){ 
        if (!cancelled) {
          setInterestedList([]);
          setNotInterestedList([]);
          setLoading(false);
        }
      }
    }
    load();
    return ()=>{ cancelled = true; }
  },[id]);

  const saveRanks = async (list, isInterested) => {
    if (!id) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) return;

    // Build rankings array with new rank order
    const rankings = list.map((item, index) => ({
      seekerInterestId: item.id ?? item.Id,
      rank: index + 1
    }));

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/seekerinterests/updateranks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          positionId: parseInt(id, 10),
          rankings
        })
      });

      if (!res.ok) {
        console.warn('Failed to save ranks', await res.text());
      }
    } catch (err) {
      console.error('Error saving ranks:', err);
    }
  };

  const handleDragStart = (e, item, listType) => {
    setDraggedItem({ item, listType });
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex, listType) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedItem || draggedItem.listType !== listType) return;

    const sourceList = listType === 'interested' ? interestedList : notInterestedList;
    const setSourceList = listType === 'interested' ? setInterestedList : setNotInterestedList;
    
    const draggedIndex = sourceList.findIndex(item => 
      (item.id ?? item.Id) === (draggedItem.item.id ?? draggedItem.item.Id)
    );
    
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    // Reorder the list
    const newList = [...sourceList];
    const [removed] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, removed);
    
    setSourceList(newList);

    // Debounce save to avoid too many API calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveRanks(newList, listType === 'interested');
    }, 500);
  };

  const renderCandidate = (r, index, listType) => {
    const seeker = r.seeker ?? r.Seeker ?? {};
    const name = (seeker.firstName ?? seeker.FirstName ?? seeker.name ?? seeker.Name ?? '') + ' ' + (seeker.lastName ?? seeker.LastName ?? '');
    const seekerUserId = seeker.userId ?? seeker.UserId ?? null;
    const posId = parseInt(id, 10);
    const isDragOver = dragOverIndex === index && draggedItem?.listType === listType;

    return (
      <div
        key={r.id ?? r.Id}
        draggable
        onDragStart={(e) => handleDragStart(e, r, listType)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index, listType)}
        className={`list-group-item d-flex justify-content-between align-items-center ${isDragOver ? 'drag-over' : ''}`}
        style={{ 
          cursor: 'grab',
          transition: 'all 0.2s ease',
          borderLeft: isDragOver ? '4px solid #0d6efd' : '4px solid transparent'
        }}
      >
        <div className="d-flex align-items-center" style={{gap: 12}}>
          <div className="drag-handle" style={{cursor: 'grab', color: '#6c757d', fontSize: '1.2rem'}}>
            ⋮⋮
          </div>
          <div className="badge bg-light text-dark border" style={{minWidth: '30px'}}>
            #{index + 1}
          </div>
          <div>
            <div><strong>{name.trim() || 'Candidate'}</strong></div>
            <div className="small text-muted">Reviewed: {new Date(r.reviewedAt ?? r.ReviewedAt).toLocaleString()}</div>
          </div>
        </div>
        <div className="d-flex align-items-center" style={{gap:12}}>
          <ChatButton 
            title={name.trim() || 'Candidate Conversation'} 
            subtitle={positionTitle || ''} 
            otherUserId={seekerUserId} 
            positionId={posId} 
            unreadCount={convUnreadMap[`${posId}|${seekerUserId}`] || 0}
          />
          <Link 
            href={`/poster/candidate/${seeker.id ?? seeker.Id}?positionId=${id}`} 
            className="btn btn-sm btn-outline-primary"
          >
            Review
          </Link>
        </div>
      </div>
    );
  };

  return (
    <Layout title="Reviewed candidates">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Ranked Candidates</h2>
          <p className="text-muted mb-0">Drag and drop to rank candidates for this position</p>
        </div>
        <div>
          <Link href="/poster/dashboard" className="btn btn-outline-secondary">Return</Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Interested Candidates Section */}
          <div className="mb-4">
            <div className="d-flex align-items-center mb-2">
              <h4 className="mb-0">
                <span className="badge bg-success me-2">Interested</span>
                {interestedList.length} {interestedList.length === 1 ? 'Candidate' : 'Candidates'}
              </h4>
            </div>
            {interestedList.length === 0 ? (
              <div className="alert alert-info">No interested candidates yet.</div>
            ) : (
              <div className="list-group">
                {interestedList.map((r, index) => renderCandidate(r, index, 'interested'))}
              </div>
            )}
          </div>

          {/* Not Interested Candidates Section */}
          <div className="mb-4">
            <div className="d-flex align-items-center mb-2">
              <h4 className="mb-0">
                <span className="badge bg-secondary me-2">Not Interested</span>
                {notInterestedList.length} {notInterestedList.length === 1 ? 'Candidate' : 'Candidates'}
              </h4>
            </div>
            {notInterestedList.length === 0 ? (
              <div className="alert alert-info">No not-interested candidates.</div>
            ) : (
              <div className="list-group">
                {notInterestedList.map((r, index) => renderCandidate(r, index, 'not-interested'))}
              </div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .list-group-item:active {
          cursor: grabbing !important;
        }
        .drag-over {
          background-color: #f8f9fa;
          transform: scale(1.02);
        }
        .drag-handle:active {
          cursor: grabbing;
        }
      `}</style>
    </Layout>
  );
}
