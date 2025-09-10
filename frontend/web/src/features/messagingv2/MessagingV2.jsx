import React, { useState } from 'react';
import { UserProvider } from '../hostdashboard/hostmessages/context/AuthContext';
import { WebSocketProvider } from '../hostdashboard/hostmessages/context/webSocketContext';
import { useAuth } from '../hostdashboard/hostmessages/hooks/useAuth';

import Contacts from './Contacts';
import Thread from './Thread';

const MessagingV2Inner = ({ role = 'guest' }) => {
  const { userId } = useAuth();
  const [selected, setSelected] = useState(null);
  const [selectedName, setSelectedName] = useState('');

  if (!userId) return <div>Loading messaging...</div>;

  return (
    <WebSocketProvider userId={userId}>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 300px', gap: 16, height: 'calc(100vh - 160px)' }}>
        <div style={{ borderRight: '1px solid #eee', overflow: 'auto' }}>
          <Contacts
            userId={userId}
            role={role}
            onSelect={(id, name) => { setSelected(id); setSelectedName(name); }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <Thread
            userId={userId}
            contactId={selected}
            contactName={selectedName}
            role={role}
          />
        </div>
        <aside style={{ borderLeft: '1px solid #eee', padding: 12 }}>
          <h4>Booking context</h4>
          <p>When available, booking details will appear here.</p>
        </aside>
      </div>
    </WebSocketProvider>
  );
};

const MessagingV2 = ({ role = 'guest' }) => (
  <UserProvider>
    <MessagingV2Inner role={role} />
  </UserProvider>
);

export default MessagingV2;


