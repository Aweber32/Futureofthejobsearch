import Layout from '../../../../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../../../config/api';
import { MessageCircle, Bot } from 'lucide-react';
import ChatModal from '../../../../components/ChatModal';

const PIPELINE_STAGES = ['Interested', 'Reviewed', 'Interviewed', 'Offer', 'Hired'];

export default function PositionCandidates(){
  const router = useRouter();
  const { id } = router.query;
  const [candidates, setCandidates] = useState([]);
  const [positionTitle, setPositionTitle] = useState('');
  const [positionDetails, setPositionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedCandidate, setDraggedCandidate] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatTitle, setChatTitle] = useState('');
  const [chatSubtitle, setChatSubtitle] = useState('');

  useEffect(()=>{
    if (!id) return;
    let cancelled = false;
    async function load(){
      try{
        const base = API_CONFIG.BASE_URL;
        
        // Fetch position details
        try{
          const pres = await fetch(`${base}/api/positions/${id}`);
          if (pres.ok){
            const pjson = await pres.json();
            setPositionTitle(pjson.title ?? pjson.Title ?? '');
            setPositionDetails(pjson);
          }
        }catch(e){ /* ignore */ }
        
        // Fetch all candidates (seeker interests)
        const res = await fetch(`${base}/api/seekerinterests?positionId=${id}`);
        if (!res.ok) { 
          setCandidates([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        
        if (!cancelled) {
          // Add pipeline stage to all candidates
          const allCandidates = (data || []).map(r => ({
            ...r,
            pipelineStage: r.pipelineStage || 'Interested' // Default to Interested if not set
          }));
          
          setCandidates(allCandidates);
          setLoading(false);
        }
      }catch(e){ 
        if (!cancelled) {
          setCandidates([]);
          setLoading(false);
        }
      }
    }
    load();
    return ()=>{ cancelled = true; }
  },[id]);

  const handleDragStart = (candidate) => {
    setDraggedCandidate(candidate);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (stage) => {
    if (!draggedCandidate) return;
    
    const candidateId = draggedCandidate.id ?? draggedCandidate.Id;
    
    // Update candidate stage locally with timestamp
    const updatedCandidates = candidates.map(c => 
      (c.id ?? c.Id) === candidateId
        ? { ...c, pipelineStage: stage, pipelineStageUpdatedAt: new Date().toISOString() }
        : c
    );
    setCandidates(updatedCandidates);
    setDraggedCandidate(null);

    // Save stage to backend via API
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const base = API_CONFIG.BASE_URL;
      
      const response = await fetch(`${base}/api/seekerinterests/${candidateId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          interested: true, // Keep them interested when moving stages
          pipelineStage: stage 
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update pipeline stage:', response.status);
        // Optionally revert the UI change or show error
      }
    } catch (err) {
      console.error('Error updating pipeline stage:', err);
    }
  };

  const handleDropNotInterested = async () => {
    if (!draggedCandidate) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const base = API_CONFIG.BASE_URL;
      const candidateId = draggedCandidate.id ?? draggedCandidate.Id;
      
      // Update interested status to false in database
      const response = await fetch(`${base}/api/seekerinterests/${candidateId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ interested: false })
      });
      
      if (response.ok) {
        // Update local state - mark candidate as not interested
        const updatedCandidates = candidates.map(c => 
          (c.id ?? c.Id) === candidateId
            ? { ...c, interested: false, Interested: false }
            : c
        );
        setCandidates(updatedCandidates);
      } else {
        console.error('Failed to mark candidate as not interested:', response.status);
        alert('Failed to update candidate status. Please try again.');
      }
    } catch (err) {
      console.error('Error marking candidate as not interested:', err);
      alert('An error occurred. Please try again.');
    }
    
    setDraggedCandidate(null);
  };

  const getCandidatesByStage = (stage) => {
    return candidates.filter(c => 
      (c.interested || c.Interested) && (c.pipelineStage || 'Interested') === stage
    );
  };

  const getNotInterestedCandidates = () => {
    return candidates.filter(c => !(c.interested || c.Interested));
  };

  const handleMarkInterested = async (candidate) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const base = API_CONFIG.BASE_URL;
      const candidateId = candidate.id ?? candidate.Id;
      
      // Update interested status in database
      const response = await fetch(`${base}/api/seekerinterests/${candidateId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ interested: true })
      });
      
      if (response.ok) {
        // Update local state - move candidate to Interested stage
        const updatedCandidates = candidates.map(c => 
          (c.id ?? c.Id) === candidateId
            ? { ...c, interested: true, Interested: true, pipelineStage: 'Interested' }
            : c
        );
        setCandidates(updatedCandidates);
      } else {
        console.error('Failed to mark candidate as interested:', response.status);
        alert('Failed to update candidate status. Please try again.');
      }
    } catch (err) {
      console.error('Error marking candidate as interested:', err);
      alert('An error occurred. Please try again.');
    }
  };

  const handleOpenChat = async (candidate) => {
    const seeker = candidate.seeker ?? candidate.Seeker ?? {};
    const seekerId = seeker.id ?? seeker.Id;
    const seekerUserId = seeker.userId ?? seeker.UserId;
    const firstName = seeker.firstName ?? seeker.FirstName ?? '';
    const lastName = seeker.lastName ?? seeker.LastName ?? '';
    const name = `${firstName} ${lastName}`.trim() || 'Candidate';

    if (!seekerUserId) {
      console.error('Cannot open chat: seeker UserId not found');
      return;
    }

    // Try to find or create conversation
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
      const base = API_CONFIG.BASE_URL;
      
      // First try to get all conversations and find the one with this seeker for this position
      const convRes = await fetch(`${base}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let conversationId = null;
      if (convRes.ok) {
        const conversations = await convRes.json();
        // Find conversation that matches this position and has this seeker as participant
        const matchingConv = conversations.find(c => 
          c.positionId === parseInt(id) && 
          c.participantUserIds && 
          c.participantUserIds.includes(seekerUserId)
        );
        if (matchingConv) {
          conversationId = matchingConv.id ?? matchingConv.Id;
        }
      }
      
      // If no conversation exists, create one
      if (!conversationId) {
        const createRes = await fetch(`${base}/api/conversations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            otherUserId: seekerUserId, 
            positionId: parseInt(id),
            subject: `${name} - ${positionTitle || 'Position'}`
          })
        });
        
        if (createRes.ok) {
          const newConv = await createRes.json();
          conversationId = newConv.id ?? newConv.Id;
        } else {
          const errorText = await createRes.text();
          console.error('Failed to create conversation:', createRes.status, errorText);
        }
      }
      
      if (conversationId) {
        setSelectedConversation(conversationId);
        setChatTitle(name);
        setChatSubtitle(positionTitle || 'Position');
        setShowChatModal(true);
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const renderCandidateCard = (candidate) => {
    const seeker = candidate.seeker ?? candidate.Seeker ?? {};
    const firstName = seeker.firstName ?? seeker.FirstName ?? '';
    const lastName = seeker.lastName ?? seeker.LastName ?? '';
    const name = `${firstName} ${lastName}`.trim() || 'Candidate';
    
    // Format reviewed timestamp from DB
    const reviewedAt = candidate.reviewedAt ?? candidate.ReviewedAt;
    const formattedReviewedDate = reviewedAt ? new Date(reviewedAt).toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }) : 'Not reviewed';
    
    // Format pipeline stage timestamp
    const pipelineStageUpdatedAt = candidate.pipelineStageUpdatedAt ?? candidate.PipelineStageUpdatedAt;
    const formattedStageDate = pipelineStageUpdatedAt ? new Date(pipelineStageUpdatedAt).toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }) : 'Not set';
    
    const stageLabel = candidate.pipelineStage ?? candidate.PipelineStage ?? 'Interested';
    const stageAction = stageLabel === 'Interested' ? 'Interested' : 
                       stageLabel === 'Reviewed' ? 'Reviewed' : 
                       stageLabel === 'Interviewed' ? 'Interviewed' :
                       stageLabel === 'Offer' ? 'Offer' : 'Hired';

    return (
      <div
        key={candidate.id ?? candidate.Id}
        draggable
        onDragStart={() => handleDragStart(candidate)}
        className="candidate-card"
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '8px',
          border: '1px solid #e5e7eb',
          cursor: 'grab',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
      >
        {/* Name and AI Score */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="mb-0" style={{ fontWeight: '600', fontSize: '13px', color: '#111827', lineHeight: '1.2' }}>
            {name}
          </h6>
          <div 
            style={{
              color: '#10b981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Coming Soon"
          >
            <Bot size={18} />
          </div>
        </div>

        {/* Timestamp */}
        <div className="mb-2" style={{ fontSize: '11px', color: '#6b7280' }}>
          <div>Moved to {stageAction}: {formattedStageDate}</div>
          <div style={{ marginTop: '2px' }}>
            Reviewed: {formattedReviewedDate}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2">
          <button 
            className="btn btn-sm flex-fill"
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '500',
              padding: '4px 8px'
            }}
            onClick={() => router.push(`/poster/candidate/${seeker.id ?? seeker.Id}?positionId=${id}`)}
          >
            Review
          </button>
          
          <button 
            className="btn btn-sm flex-fill"
            style={{
              border: '1px solid #10b981',
              color: '#10b981',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '500',
              padding: '4px 8px',
              background: 'white'
            }}
            onClick={() => handleOpenChat(candidate)}
          >
            <MessageCircle size={12} className="me-1" style={{ display: 'inline' }} />
            Chat
          </button>
        </div>
      </div>
    );
  };

  // Calculate stats
  const interestedCandidates = candidates.filter(c => c.interested || c.Interested);
  const totalCandidates = interestedCandidates.length;
  const interviewedCount = interestedCandidates.filter(c => 
    ['Interviewed', 'Offer', 'Hired'].includes(c.pipelineStage)
  ).length;
  const interviewedPercent = totalCandidates > 0 
    ? Math.round((interviewedCount / totalCandidates) * 100) 
    : 0;
  
  const acceptedCount = interestedCandidates.filter(c => c.pipelineStage === 'Hired').length;
  const acceptancePercent = totalCandidates > 0
    ? Math.round((acceptedCount / totalCandidates) * 100)
    : 0;

  const notInterestedCandidates = getNotInterestedCandidates();

  return (
    <Layout title="Hiring Pipeline">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1" style={{ fontWeight: '700', fontSize: '24px' }}>Hiring Pipeline</h2>
          <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
            {totalCandidates} Candidates | {interviewedPercent}% Interviewed | {acceptancePercent}% Acceptance
          </p>
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
          {/* Kanban Board */}
          <div style={{ 
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '16px',
            marginBottom: '24px'
          }}>
            {PIPELINE_STAGES.map(stage => {
              const stageCandidates = getCandidatesByStage(stage);
              return (
                <div
                  key={stage}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage)}
                  style={{
                    flex: '1 1 0',
                    minWidth: '180px',
                    minHeight: '300px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
                  {/* Column Header */}
                  <div className="mb-2">
                    <h5 style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#111827',
                      marginBottom: '4px'
                    }}>
                      {stage}
                    </h5>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6b7280'
                    }}>
                      {stageCandidates.length} {stageCandidates.length === 1 ? 'candidate' : 'candidates'}
                    </div>
                  </div>

                  {/* Cards */}
                  <div>
                    {stageCandidates.length === 0 ? (
                      <div 
                        style={{
                          textAlign: 'center',
                          padding: '30px 10px',
                          color: '#9ca3af',
                          fontSize: '12px'
                        }}
                      >
                        No candidates
                      </div>
                    ) : (
                      stageCandidates.map(candidate => renderCandidateCard(candidate))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drop Zone for Not Interested */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropNotInterested}
            style={{
              border: draggedCandidate ? '2px dashed #ef4444' : '2px dashed transparent',
              borderRadius: '8px',
              padding: draggedCandidate ? '8px' : '0',
              marginBottom: '24px',
              background: draggedCandidate ? '#fef2f2' : 'transparent',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              minHeight: draggedCandidate ? '60px' : '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {draggedCandidate && (
              <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>
                🗑️ Drop here to mark as Not Interested
              </div>
            )}
          </div>

          {/* Not Interested Section */}
          {notInterestedCandidates.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h4 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
                Not Interested
              </h4>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Reviewed At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notInterestedCandidates.map(candidate => {
                    const seeker = candidate.seeker ?? candidate.Seeker ?? {};
                    const firstName = seeker.firstName ?? seeker.FirstName ?? '';
                    const lastName = seeker.lastName ?? seeker.LastName ?? '';
                    const name = `${firstName} ${lastName}`.trim() || 'Candidate';
                    
                    // Format reviewed timestamp from DB
                    const reviewedAt = candidate.reviewedAt ?? candidate.ReviewedAt;
                    const formattedReviewedDate = reviewedAt ? new Date(reviewedAt).toLocaleDateString('en-US', { 
                      month: 'numeric', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }) : 'Not reviewed';
                    
                    return (
                      <tr key={candidate.id ?? candidate.Id}>
                        <td>{name}</td>
                        <td style={{ fontSize: '14px', color: '#6b7280' }}>{formattedReviewedDate}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => handleMarkInterested(candidate)}
                            >
                              Make Interested
                            </button>
                            <Link 
                              href={`/poster/candidate/${seeker.id ?? seeker.Id}?positionId=${id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              View Profile
                            </Link>
                            <button 
                              className="btn btn-sm"
                              style={{
                                border: '1px solid #10b981',
                                color: '#10b981',
                                background: 'white'
                              }}
                              onClick={() => handleOpenChat(candidate)}
                            >
                              <MessageCircle size={14} className="me-1" style={{ display: 'inline' }} />
                              Chat
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Chat Modal */}
      <ChatModal
        open={showChatModal}
        onClose={() => setShowChatModal(false)}
        title={chatTitle}
        subtitle={chatSubtitle}
        conversationId={selectedConversation}
      />

      <style jsx>{`
        .candidate-card:active {
          cursor: grabbing !important;
          opacity: 0.5;
        }
      `}</style>
    </Layout>
  );
}
