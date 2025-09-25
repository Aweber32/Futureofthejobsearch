import { useEffect, useRef, useState } from 'react';

export default function ChatModal({ open, onClose, title, subtitle }){
  const [messages, setMessages] = useState([
    { id: 1, fromMe: false, text: 'Hi — thanks for your interest in this role! How can I help?' },
    { id: 2, fromMe: true, text: 'Hi — I’d love to learn more about the team and the day-to-day.' }
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(()=>{
    if (open) {
      // small delay so modal CSS transitions feel smooth
      setTimeout(()=>{
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 50);
    }
  },[open, messages.length]);

  if (!open) return null;

  function send(){
    if (!input.trim()) return;
    const msg = { id: Date.now(), fromMe: true, text: input.trim() };
    setMessages(m => [...m, msg]);
    setInput('');
    // fake reply for demo
    setTimeout(()=>{
      setMessages(m => [...m, { id: Date.now()+1, fromMe: false, text: 'Thanks — I’ll get back to you soon.' }]);
    }, 800 + Math.random()*800);
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
          {messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.fromMe ? 'me' : 'them'}`}>
              <div className="chat-text">{m.text}</div>
            </div>
          ))}
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
