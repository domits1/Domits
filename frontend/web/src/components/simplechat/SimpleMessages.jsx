import React, { useState } from 'react';
import { UserProvider } from '../../features/hostdashboard/hostmessages/context/AuthContext';
import { WebSocketProvider } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import { useAuth } from '../../features/hostdashboard/hostmessages/hooks/useAuth';

import SimpleContactList from './SimpleContactList';
import SimpleChatWindow from './SimpleChatWindow';

const SimpleMessagesInner = ({ role = 'host' }) => {
    const { userId } = useAuth();
    const [selectedContact, setSelectedContact] = useState(null);

    if (!userId) {
        return <div>Loading user...</div>;
    }

    return (
        <WebSocketProvider userId={userId}>
            <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 160px)' }}>
                <div style={{ width: 320, borderRight: '1px solid #ececec', overflow: 'auto' }}>
                    <SimpleContactList
                        userId={userId}
                        role={role}
                        onSelect={setSelectedContact}
                    />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <SimpleChatWindow
                        userId={userId}
                        contact={selectedContact}
                        role={role}
                    />
                </div>
            </div>
        </WebSocketProvider>
    );
};

const SimpleMessages = ({ role = 'host' }) => {
    return (
        <UserProvider>
            <SimpleMessagesInner role={role} />
        </UserProvider>
    );
};

export default SimpleMessages;


