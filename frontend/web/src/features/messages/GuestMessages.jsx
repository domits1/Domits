import React, { useEffect, useState } from "react";
import { UserProvider, useUser } from "../hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../hostdashboard/hostmessages/hooks/useAuth";

import useFetchContacts from "../hostdashboard/hostmessages/hooks/useFetchContacts";

import ContactList from "../../components/messages/ContactList";
import ChatScreen from "../../components/messages/ChatScreen";
import BookingTab from "../../components/messages/BookingTab";

import "../hostdashboard/hostmessages/styles/sass/hostMessages.scss";
import Navbar from "../../components/base/navbar";
import Pages from "../guestdashboard/Pages";

const GuestMessagesInner = () => {
  const { userId, accessToken } = useAuth();

  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);
  const [selectedContactAvatar, setSelectedContactAvatar] = useState(null);

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const isMobile = screenWidth < 768;

  const [testMessages, setTestMessages] = useState([]);
  const [latestContactListMessage, setLatestContactListMessage] = useState(null);

  const { contacts, pendingContacts, loading: contactsLoading, setContacts } = useFetchContacts(userId, "guest");

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleContactClick = (contactId, contactName, profileImage, threadId = null) => {
    setSelectedContactId(contactId);
    setSelectedContactName(contactName);
    setSelectedContactAvatar(profileImage || null);
  };

  const handleBackToContacts = () => {
    setSelectedContactId(null);
    setSelectedContactName(null);
    setSelectedContactAvatar(null);
  };

  const handleTestMessage = (messageData) => {
    const testMessage = {
      id: `test-${Date.now()}-${Math.random()}`,
      userId: "demo-host",
      recipientId: userId,
      ...messageData,
      isSent: false,
      isRead: false,
    };

    setTestMessages((prev) => [...prev, testMessage]);
    if (selectedContactId) setLatestContactListMessage(testMessage);
  };

  const handleSendAutomatedTestMessages = () => {
    if (!selectedContactId) {
      alert("Select a conversation first.");
      return;
    }

    const automated = [
      {
        text: `👋 Welcome! Thanks for booking. I'm here to help with anything you need.`,
        createdAt: new Date().toISOString(),
        isAutomated: true,
        messageType: "host_property_welcome",
      },
      {
        text: `📍 Check-in is flexible. Share your ETA and I’ll prepare accordingly.`,
        createdAt: new Date(Date.now() + 500).toISOString(),
        isAutomated: true,
        messageType: "checkin_instructions",
      },
      {
        text: `📶 Wi-Fi details will be in the guidebook on arrival.`,
        createdAt: new Date(Date.now() + 1000).toISOString(),
        isAutomated: true,
        messageType: "wifi_info",
      },
    ];

    automated.forEach((m) => handleTestMessage(m));
  };

  const showContactList = isMobile ? !selectedContactId : true;
  const showChatScreen = isMobile ? !!selectedContactId : !!selectedContactId;

  if (!userId) return <div>Loading user info...</div>;

  return (
    <WebSocketProvider userId={userId} token={accessToken}>
      <div className="guest-chat-components">
        {showContactList && (
          <div className="guest-contact-panel">
            {/* Left navigation menu */}
            <div style={{ width: "15rem" }}>
              <Pages onNavigate={() => {}} />
            </div>

            <ContactList
              userId={userId}
              onContactClick={handleContactClick}
              onCloseChat={() => {}}
              message={latestContactListMessage}
              dashboardType="guest"
              isChatOpen={!!selectedContactId}
              activeContactId={selectedContactId}
              contacts={contacts}
              pendingContacts={pendingContacts}
              loading={contactsLoading}
              setContacts={setContacts}
              onNewMessage={() => {}}
            />
          </div>
        )}

        {isMobile && selectedContactId && (
          <button onClick={handleBackToContacts} className="ContactsBack-button">
            ← Back to contacts
          </button>
        )}

        {selectedContactId && (
          <div style={{ padding: "6px 10px" }}>
            <button onClick={handleSendAutomatedTestMessages} className="ContactsBack-button">
              🤖 Send automated test messages
            </button>
          </div>
        )}

        <div className="guest-chat-panel">
          {showChatScreen && (
            <>
              <ChatScreen
                userId={userId}
                contactId={selectedContactId}
                contactName={selectedContactName}
                contactImage={selectedContactAvatar}
                onBack={isMobile ? handleBackToContacts : null}
                dashboardType="guest"
                handleContactListMessage={(msg) => setLatestContactListMessage(msg)}
                testMessages={testMessages}
              />

              <div className="guest-booking-tab-overlay">
                <BookingTab
                  userId={userId}
                  contactId={selectedContactId}
                  contactName={selectedContactName}
                  dashboardType="guest"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <Navbar isLoggedIn={!!userId} />
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
