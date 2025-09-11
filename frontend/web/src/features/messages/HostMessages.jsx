import React, { useEffect, useState } from 'react';
import { UserProvider } from '../hostdashboard/hostmessages/context/AuthContext';
import { WebSocketProvider } from '../hostdashboard/hostmessages/context/webSocketContext';
import { useAuth } from '../hostdashboard/hostmessages/hooks/useAuth';

import ContactList from '../../components/messages/ContactList';
import ChatScreen from '../../components/messages/ChatScreen';
import BookingTab from '../../components/messages/BookingTab';

const HostMessagesInner = () => {
  const { userId } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1440;

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleContactClick = (contactId, contactName) => {
    setSelectedContactId(contactId);
    setSelectedContactName(contactName);
  };

  const handleBackToContacts = () => {
    setSelectedContactId(null);
    setSelectedContactName(null);
  };

  const showContactList = isMobile ? !selectedContactId : isTablet ? !selectedContactId : true;
  const showChatScreen = isMobile ? !!selectedContactId : isTablet ? !!selectedContactId : true;

  if (!userId) return <div>Loading user info...</div>;

  return (
    <WebSocketProvider userId={userId}>
      <div className={`host-chat-components`}>
        {showContactList && (
          <ContactList
            userId={userId}
            onContactClick={handleContactClick}
            dashboardType={'host'}
            showPending={false}
            showQuickStart={false}
          />
        )}
        {isMobile && selectedContactId && (
          <button onClick={handleBackToContacts} className="ContactsBack-button">
            ← Back to contacts
          </button>
        )}
        {showChatScreen && (
          <ChatScreen
            userId={userId}
            contactId={selectedContactId}
            contactName={selectedContactName}
            onBack={isTablet ? handleBackToContacts : null}
            dashboardType={'host'}
            handleContactListMessage={() => {}}
          />
        )}
        {showChatScreen && (
          <div className={`host-booking-tab-overlay`}>
            <BookingTab
              userId={userId}
              contactId={selectedContactId}
              contactName={selectedContactName}
              dashboardType={'host'}
            />
          </div>
        )}
      </div>
    </WebSocketProvider>
  );
};

const HostMessages = () => (
  <main className="page-body">
    <UserProvider>
      <HostMessagesInner />
    </UserProvider>
  </main>
);

export default HostMessages;


