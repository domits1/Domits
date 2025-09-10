import React, { useContext, useEffect, useRef, useState } from 'react';
import { WebSocketContext } from '../hostdashboard/hostmessages/context/webSocketContext';
import useFetchMessages from '../hostdashboard/hostmessages/hooks/useFetchMessages';
import { useSendMessage } from '../hostdashboard/hostmessages/hooks/useSendMessage';
import ChatUploadAttachment from '../hostdashboard/hostmessages/components/chatUploadAttachment';
import { v4 as uuidv4 } from 'uuid';

const Thread = ({ userId, contactId, contactName, role }) => {
  const { messages, loading, fetchMessages, addNewMessage } = useFetchMessages(userId);
  const { messages: wsMessages } = useContext(WebSocketContext) || { messages: [] };
  const { sendMessage, sending } = useSendMessage(userId);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const added = useRef(new Set());

  useEffect(()=>{
    if (contactId) fetchMessages(contactId);
  }, [contactId, fetchMessages]);

  useEffect(()=>{
    wsMessages.forEach(msg => {
      const relevant = (msg.userId === userId && msg.recipientId === contactId) || (msg.userId === contactId && msg.recipientId === userId);
      if (relevant && !added.current.has(msg.id)) {
        addNewMessage(msg);
        added.current.add(msg.id);
      }
    });
  }, [wsMessages, userId, contactId, addNewMessage]);

  const onUploadComplete = (url) => setFiles(prev => prev.includes(url) ? prev : [...prev, url]);

  const onSend = async () => {
    if (!contactId) return;
    if (!text.trim() && files.length===0) return;
    const res = await sendMessage(contactId, text, files);
    if (!res || !res.success) return;
    const temp = { id: uuidv4(), userId, recipientId: contactId, text, fileUrls: files, createdAt: new Date().toISOString(), isSent: true };
    addNewMessage(temp);
    setText('');
    setFiles([]);
  };

  if (!contactId) return <div style={{ padding:12 }}>Select a conversation</div>;

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%' }}>
      <div style={{ overflow: 'auto', padding: 12 }}>
        <h4>{contactName}</h4>
        {loading ? <div>Loading...</div> : (
          messages.slice().sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt)).map(m => (
            <div key={m.id} style={{ marginBottom: 8, display: 'flex', justifyContent: m.userId===userId ? 'flex-end' : 'flex-start' }}>
              <div style={{ background: m.userId===userId ? '#d1f5d3' : '#f1f1f1', padding: 8, borderRadius: 8, maxWidth: 520 }}>
                {m.text}
                {m.fileUrls?.length>0 && (
                  <div style={{ marginTop: 6 }}>
                    {m.fileUrls.map((u,i)=> (
                      u.endsWith('.mp4') ? (
                        <video key={i} controls style={{ maxWidth: 220, display: 'block' }}><source src={u} type="video/mp4"/></video>
                      ) : (
                        <img key={i} src={u} alt="attachment" style={{ maxWidth: 220, display: 'block' }} />
                      )
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{new Date(m.createdAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eee' }}>
        <ChatUploadAttachment onUploadComplete={onUploadComplete} />
        <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type a message..." style={{ flex:1 }} onKeyUp={(e)=>{ if (e.key==='Enter') onSend(); }} />
        <button disabled={sending} onClick={onSend}>{sending ? 'Sending...' : 'Send'}</button>
      </div>
    </div>
  );
};

export default Thread;


