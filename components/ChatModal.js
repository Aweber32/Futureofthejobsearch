import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import API_CONFIG from '../config/api';

export default function ChatModal({ open, onClose, title, subtitle, conversationId }){
  const [messages, setMessages] = useState([]);
  const [lastReadAt, setLastReadAt] = useState({}); // { userId: lastReadAt }
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const connRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const currentUserRef = useRef(null);

  useEffect(() => {
    currentUserRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('fjs_token');
    if (!token) { setCurrentUserId(null); return; }
    try {
      const parts = token.split('.');
      if (parts.length < 2) { setCurrentUserId(null); return; }
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4 || 4)) % 4, '=');
      const payload = JSON.parse(atob(padded));
      setCurrentUserId(payload?.sub || payload?.nameid || null);
    } catch (err) {
      console.warn('Failed to decode JWT payload for user id', err);
      setCurrentUserId(null);
    }
  }, [open]);

  useEffect(()=>{
    if (open) {
      // small delay so modal CSS transitions feel smooth
      setTimeout(()=>{
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 50);
    }
  },[open, messages.length]);

  // Setup SignalR connection when conversationId is present
  useEffect(()=>{
    if (!open) return;

    const token = (typeof window !== 'undefined') ? localStorage.getItem('fjs_token') : null;

    // if there's no conversationId, don't try to connect -- keep UI as demo or empty
    if (!conversationId) return;

    const url = `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/hubs/chat`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => token || '' })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Error)
      .build();

    connRef.current = connection;

    const start = async () => {
      try {

        connection.on('MessageReceived', (msg) => {
          const uid = currentUserRef.current || '';
          setMessages(m => [...m, { id: msg.id, fromMe: uid && msg.senderUserId === uid, text: msg.text, createdAt: msg.createdAt, senderUserId: msg.senderUserId }]);
        });

        connection.on('ReadReceipt', (r) => {
          // r: { userId, conversationId, lastReadAt }
            console.log('[SignalR] ReadReceipt event received:', r);
          setLastReadAt(prev => ({ ...prev, [r.userId]: r.lastReadAt }));
        });

        await connection.start();
        await connection.invoke('JoinConversation', conversationId);

        // mark as read on open
        try { await connection.invoke('MarkRead', conversationId); } catch (e) { console.warn('MarkRead failed', e); }

        // fetch recent messages via REST for initial history
        try{
          const res = await fetch(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/api/conversations/${conversationId}/messages?take=50`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok){
            const data = await res.json();
            const uid = currentUserRef.current || '';
            setMessages(data.reverse().map(m => ({ id: m.id, fromMe: uid && m.senderUserId === uid, text: m.text, createdAt: m.createdAt, senderUserId: m.senderUserId }))); 
          }
        }catch(err){ console.warn('failed to fetch messages', err); }

      } catch (err) {
        console.error('SignalR start failed', err);
      }
    };

    start();

    return () => {
      // mark read and leave group then stop
      const stop = async () => {
        try {
          if (connection.state === signalR.HubConnectionState.Connected) {
            try { await connection.invoke('MarkRead', conversationId); } catch (e){}
            try { await connection.invoke('LeaveConversation', conversationId); } catch (e){}
            await connection.stop();
          }
        } catch (e) { console.warn('error stopping connection', e); }
      };
      stop();
      connRef.current = null;
    };
  }, [open, conversationId]);

  if (!open) return null;

  async function send(){
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    // if connected to SignalR and conversationId exists, invoke hub method
    const conn = connRef.current;
    if (conn && conn.state === signalR.HubConnectionState.Connected && conversationId){
      try{
        await conn.invoke('SendMessage', conversationId, { text });
      }catch(err){
        console.warn('SendMessage failed, falling back to local append', err);
        setMessages(m => [...m, { id: Date.now(), fromMe: true, text }]);
      }
    } else {
      // fallback - append locally for demo
      setMessages(m => [...m, { id: Date.now(), fromMe: true, text }]);
    }
  }

  return (
    <div className="chat-modal-overlay" role="dialog" aria-modal="true">
      <div className="chat-modal" data-testid="chat-modal">
        <div className="chat-header d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <div className="chat-avatar me-2">{(title||'Chat').slice(0,1)}</div>
            <div>
              <div className="fw-bold">{title || 'Conversation'}</div>
              {subtitle ? (
                <div className="small text-muted">{subtitle}</div>
              ) : (
                <div className="small text-muted">Messages</div>
              )}
            </div>
          </div>
          <div>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="chat-list" ref={listRef}>
          {messages.map((m, idx) => {
            // Read receipt logic: show checkmarks for sent/read
            let readStatus = null;
            if (m.fromMe) {
              // Find the other participant's lastReadAt
              const others = Object.entries(lastReadAt).filter(([uid]) => uid !== currentUserId);
              let isRead = false;
              if (others.length > 0) {
                // If any other participant has lastReadAt >= this message
                isRead = others.some(([uid, lra]) => lra && new Date(lra) >= new Date(m.createdAt));
              }
                console.log('[ChatModal] Message', m, 'isRead:', isRead, 'others:', others);
              readStatus = (
                <span className="read-status ms-2" style={{fontSize:'0.9em',color:isRead?'#0b84ff':'#bbb'}}>
                  {isRead ? '✓✓ Read' : '✓ Delivered'}
                </span>
              );
            }
            return (
              <div key={m.id} className={`chat-bubble ${m.fromMe ? 'me' : 'them'}`}> 
                <div className="chat-text">{m.text}</div>
                {readStatus}
              </div>
            );
          })}
        </div>

        <div className="chat-input d-flex align-items-center">
          <input
            type="text"
            className="form-control me-2"
            placeholder="iMessage-like chat — type a message"
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') send(); }}
          />
          <button className="btn btn-primary" onClick={send}>Send</button>
        </div>
      </div>

      <style jsx>{`
        .chat-modal-overlay{
          position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;z-index:2000;background:rgba(0,0,0,0.35);
        }
        .chat-modal{
          width:420px;max-width:96%;height:640px;border-radius:18px;background:#f7f7f8;box-shadow:0 20px 60px rgba(0,0,0,0.35);display:flex;flex-direction:column;overflow:hidden;margin-bottom:20px;
        }
        .chat-header{padding:12px 16px;background:linear-gradient(180deg,#ffffff,#f1f1f3);border-bottom:1px solid rgba(0,0,0,0.04)}
        .chat-avatar{width:40px;height:40px;border-radius:20px;background:#dfe6ff;color:#1f2d78;display:flex;align-items:center;justify-content:center;font-weight:700}
        .chat-list{flex:1;padding:16px;overflow:auto;background:linear-gradient(180deg,#fbfbfb,#f7f7f8)}
        .chat-bubble{max-width:78%;margin-bottom:12px;padding:10px 14px;border-radius:18px;position:relative}
        .chat-bubble.me{margin-left:auto;background:linear-gradient(180deg,#0b84ff,#0066d6);color:white;border-bottom-right-radius:6px}
        .chat-bubble.them{margin-right:auto;background:#e9e9eb;color:#222;border-bottom-left-radius:6px}
        .chat-text{white-space:pre-wrap}
        .chat-input{padding:12px;box-shadow:0 -6px 12px rgba(0,0,0,0.03);background:linear-gradient(180deg,#ffffff,#fafafa)}
        .chat-input .form-control{border-radius:999px;padding:10px 14px}
        /* On small screens keep full-height bottom-aligned (like a sheet). On wider screens center the modal */
        @media (max-width:480px){ .chat-modal{height:100%;border-radius:0;margin-bottom:0} }
        @media (min-width:768px){
          .chat-modal-overlay{align-items:center}
          .chat-modal{margin-bottom:0}
        }
      `}</style>
    </div>
  );
}
