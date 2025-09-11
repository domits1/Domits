import React, { useEffect, useState } from 'react';
import { UserProvider } from '../hostdashboard/hostmessages/context/AuthContext';
import { WebSocketProvider } from '../hostdashboard/hostmessages/context/webSocketContext';
import { useAuth } from '../hostdashboard/hostmessages/hooks/useAuth';

import ContactList from '../../components/messages/ContactList';
import ChatScreen from '../../components/messages/ChatScreen';
import BookingTab from '../../components/messages/BookingTab';
import TestAutomatedMessages from '../../components/messages/TestAutomatedMessages';

const GuestMessagesInner = () => {
  const { userId } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [testMessages, setTestMessages] = useState([]);
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

  const handleTestMessage = (messageData) => {
    // Add the test message to our state so it appears in the chat
    const testMessage = {
      id: `test-${Date.now()}-${Math.random()}`,
      userId: 'demo-host', // Simulating host sending the message
      recipientId: userId,
      ...messageData,
      isSent: false,
      isRead: false
    };

    setTestMessages(prev => [...prev, testMessage]);

    // Also simulate adding it to the contact list message
    if (selectedContactId) {
      // This would normally update the contact's latest message
      console.log('🤖 Test automated message added to chat:', testMessage);
    }
  };

  const showContactList = isMobile ? !selectedContactId : isTablet ? !selectedContactId : true;
  const showChatScreen = isMobile ? !!selectedContactId : isTablet ? !!selectedContactId : true;

  if (!userId) return <div>Loading user info...</div>;

  return (
    <WebSocketProvider userId={userId}>
      {/* TEMPORARY TEST COMPONENT - Remove after testing */}
      <TestAutomatedMessages onSendTestMessage={handleTestMessage} />

      <div className={`guest-chat-components`}>
        {showContactList && (
          <ContactList
            userId={userId}
            onContactClick={handleContactClick}
            dashboardType={'guest'}
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
            dashboardType={'guest'}
            handleContactListMessage={() => {}}
            testMessages={testMessages}
          />
        )}
        {showChatScreen && (
          <div className={`guest-booking-tab-overlay`}>
            <BookingTab
              userId={userId}
              contactId={selectedContactId}
              contactName={selectedContactName}
              dashboardType={'guest'}
            />
          </div>
        )}
      </div>
    </WebSocketProvider>
  );
};

const GuestMessages = () => (
  <main className="page-body">
    <UserProvider>
      <GuestMessagesInner />
    </UserProvider>
  </main>
);

export default GuestMessages;


