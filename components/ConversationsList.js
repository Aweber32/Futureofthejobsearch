import { useEffect, useState } from 'react';
import ChatButton from './ChatButton';
import { API_CONFIG } from '../config/api';

export default function ConversationsList({ currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load conversations');
        const data = await res.json();
        setConversations(data || []);
      } catch (e) {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading conversations…</div>;
  if (!conversations.length) return <div>No conversations yet.</div>;

  return (
    <div className="list-group">
      {conversations.map(conv => (
        <div key={conv.id} className="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <div className="fw-bold">{conv.subject || 'Conversation'}</div>
            <div className="small text-muted">{conv.lastMessageText || 'No messages yet.'}</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {conv.unreadCount > 0 && (
              <span className="badge bg-danger rounded-pill">{conv.unreadCount}</span>
            )}
            <ChatButton 
              title={conv.subject || 'Conversation'} 
              subtitle={conv.lastMessageText || ''} 
              otherUserId={conv.participantUserIds.find(uid => uid !== currentUserId)} 
              positionId={conv.positionId} 
              unreadCount={conv.unreadCount}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
