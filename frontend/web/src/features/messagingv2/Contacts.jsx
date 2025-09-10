import React, { useEffect, useMemo, useState } from 'react';
import useFetchContacts from '../hostdashboard/hostmessages/hooks/useFetchContacts';

const Contacts = ({ userId, role, onSelect }) => {
  const { contacts, pendingContacts, loading } = useFetchContacts(userId, role);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('contacts');

  const list = useMemo(() => {
    const src = tab === 'contacts' ? contacts : pendingContacts;
    const filtered = search ? src.filter(c => (c.givenName || '').toLowerCase().includes(search)) : src;
    return [...filtered].sort((a,b) => new Date(b.latestMessage?.createdAt||0) - new Date(a.latestMessage?.createdAt||0));
  }, [contacts, pendingContacts, search, tab]);

  return (
    <div style={{ padding: 12 }}>
      <h3>Conversations</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input placeholder="Search" value={search} onChange={(e)=>setSearch(e.target.value.toLowerCase())} />
        <select value={tab} onChange={(e)=>setTab(e.target.value)}>
          <option value="contacts">Contacts</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      {loading ? <div>Loading...</div> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {list.map(c => (
            <li key={`${c.recipientId}-${c.userId}`}>
              <button style={{ width:'100%', textAlign:'left', padding:8, border:'1px solid #eee', borderRadius:6, marginBottom:6 }} onClick={()=>onSelect?.(c.recipientId, c.givenName)}>
                <div style={{ fontWeight:600 }}>{c.givenName || 'Unknown'}</div>
                <div style={{ fontSize:12, color:'#777' }}>{c.latestMessage?.text || 'No messages yet'}</div>
              </button>
            </li>
          ))}
          {list.length===0 && <div>No conversations yet</div>}
        </ul>
      )}
    </div>
  );
};

export default Contacts;


