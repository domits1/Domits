import React, { useEffect, useState } from "react";
import { UserProvider } from "../../features/hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../../features/hostdashboard/hostmessages/hooks/useAuth";
import { useUser } from "../../features/hostdashboard/hostmessages/context/AuthContext";

import useFetchContacts from "../../features/hostdashboard/hostmessages/hooks/useFetchContacts";

import ContactList from "./ContactList";
import ChatScreen from "./ChatScreen";
import BookingTab from "./BookingTab";
import NewContactModal from "./NewContactModal";

import "./messagesV2.scss";

const Messages = ({ dashboardType }) => {
  return (
    <UserProvider>
      <MessagesContent dashboardType={dashboardType} />
    </UserProvider>
  );
};

const MessagesContent = ({ dashboardType }) => {
  const { userId } = useAuth();
  const { accessToken } = useUser();

  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);
  const [selectedContactImage, setSelectedContactImage] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedThreadContext, setSelectedThreadContext] = useState(null);

  const [message, setMessage] = useState([]);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1280;

  const { contacts, pendingContacts, loading: contactsLoading, setContacts } = useFetchContacts(userId, dashboardType);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // NEW: accept optional threadContext (propertyId/title/image/dates/channel)
  const handleContactClick = (contactId, contactName, contactImage, threadId = null, threadContext = null) => {
    setSelectedContactId(contactId);
    setSelectedContactName(contactName);
    setSelectedContactImage(contactImage || null);
    setSelectedThreadId(threadId);
    setSelectedThreadContext(threadContext || null);
  };

  const handleBackToContacts = () => {
    setSelectedContactId(null);
    setSelectedContactName(null);
    setSelectedThreadId(null);
    setSelectedThreadContext(null);
  };

  const handleCloseChat = (contactId = null) => {
    if (!contactId || contactId === selectedContactId) {
      setSelectedContactId(null);
      setSelectedContactName(null);
      setSelectedContactImage(null);
      setSelectedThreadId(null);
      setSelectedThreadContext(null);
    }
  };

  const handleContactListMessage = (sentMessage) => {
    setMessage(sentMessage);
  };

  const showContactList = isMobile ? !selectedContactId : true;
  const showChatScreen = isMobile ? !!selectedContactId : true;

  const showDetailsPanel = !isMobile && !isTablet; // desktop only

  return (
    <div className={`${dashboardType}-dashboard-page-body messages-v2`}>
      <WebSocketProvider userId={userId} token={accessToken}>
        {userId ? (
          <>
            <div className="messages-v2-header">
              <div />
              <h1 className="messages-v2-title">Messages</h1>
              <button className="messages-v2-new" onClick={() => setIsNewMessageOpen(true)}>
                + New Message
              </button>
            </div>

            <NewContactModal
              isOpen={isNewMessageOpen}
              onClose={() => setIsNewMessageOpen(false)}
              onCreate={(newContact) => setContacts((prev) => [newContact, ...(Array.isArray(prev) ? prev : [])])}
              userId={userId}
              dashboardType={dashboardType}
            />

            <div className="messages-v2-grid">
              {showContactList && (
                <div className="messages-v2-card messages-v2-contactlist">
                  <ContactList
                    userId={userId}
                    onContactClick={handleContactClick}
                    onCloseChat={handleCloseChat}
                    message={message}
                    dashboardType={dashboardType}
                    isChatOpen={!!selectedContactId}
                    activeContactId={selectedContactId}
                    contacts={contacts}
                    pendingContacts={pendingContacts}
                    loading={contactsLoading}
                    setContacts={setContacts}
                  />
                </div>
              )}

              {showChatScreen && (
                <div className="messages-v2-card messages-v2-chat">
                  <ChatScreen
                    userId={userId}
                    handleContactListMessage={handleContactListMessage}
                    contactId={selectedContactId}
                    contactName={selectedContactName}
                    contactImage={selectedContactImage}
                    threadId={selectedThreadId}
                    threadContext={selectedThreadContext}
                    onBack={isTablet ? handleBackToContacts : null}
                    dashboardType={dashboardType}
                  />
                </div>
              )}

              {showDetailsPanel && (
                <div className="messages-v2-card">
                  <BookingTab
                    userId={userId}
                    contactId={selectedContactId}
                    contactName={selectedContactName}
                    dashboardType={dashboardType}
                    threadContext={selectedThreadContext}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div>Loading user info...</div>
        )}
      </WebSocketProvider>
    </div>
  );
};

export default Messages;
