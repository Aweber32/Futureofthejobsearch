import { useState } from 'react';
import ChatModal from './ChatModal';

export default function ChatButton({ title = 'Conversation', subtitle = '' }){
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-sm btn-outline-success" onClick={()=>setOpen(true)}>Chat</button>
      <ChatModal open={open} onClose={()=>setOpen(false)} title={title} subtitle={subtitle} />
    </>
  );
}
