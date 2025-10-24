import { useState, useEffect } from 'react';
import ChatModal from './ChatModal';
import API_CONFIG from '../config/api';

export default function ChatButton({ title = 'Conversation', subtitle = '' , otherUserId = null, positionId = null, unreadCount = 0 }){
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      console.log('[ChatButton] unreadCount prop:', unreadCount, 'title:', title, 'positionId:', positionId);
    }, [unreadCount, title, positionId]);

  async function openChat(){
    // fetch token
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (!token) {
      // open modal to prompt login (the modal UI will handle missing token)
      setOpen(true);
      return;
    }

    setLoading(true);
    try{
      // Create or fetch a 1:1 conversation
      const res = await fetch(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // Use camelCase keys to align with default ASP.NET Core JSON binding
        body: JSON.stringify({ otherUserId: otherUserId, positionId: positionId, subject: title })
      });
      if (res.ok){
        const json = await res.json();
        setConversationId(json.id || json.Id || json.id);
        setOpen(true);
      } else if (res.status === 401){
        // unauthenticated - open modal so the UI can show login
        setOpen(true);
      } else {
        // Log details to help diagnose 4xx/5xx responses (e.g., model binding 400s)
        try {
          const text = await res.text();
          console.warn('ChatButton: POST /api/conversations failed', { status: res.status, body: text, payload: { otherUserId, positionId, subject: title } });
        } catch(e) {
          console.warn('ChatButton: POST /api/conversations failed', { status: res.status, payload: { otherUserId, positionId, subject: title } });
        }
        // fallback open anyway
        setOpen(true);
      }
    }catch(err){
      console.warn('Failed to create conversation', err);
      setOpen(true);
    }finally{ setLoading(false); }
  }

  return (
    <>
      <button className="btn btn-sm btn-outline-success position-relative" onClick={openChat} disabled={loading}>
        {loading ? 'Opening…' : 'Chat'}
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
            <span className="visually-hidden">Unread messages</span>
          </span>
        )}
      </button>
      <ChatModal open={open} onClose={()=>setOpen(false)} title={title} subtitle={subtitle} conversationId={conversationId} />
    </>
  );
}
