import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { UserProvider, useUser } from "../../features/hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../../features/hostdashboard/hostmessages/hooks/useAuth";

import useFetchContacts from "../../features/hostdashboard/hostmessages/hooks/useFetchContacts";

import ContactList from "./ContactList";
import ChatScreen from "./ChatScreen";
import NewContactModal from "./NewContactModal";
import ListingPanel from "./ListingPanel";

import "./messagesV2.scss";

const Messages = ({ dashboardType }) => {
  return (
    <UserProvider>
      <MessagesContent dashboardType={dashboardType} />
    </UserProvider>
  );
};

const MessagesContent = ({ dashboardType }) => {
  const location = useLocation();
  const { userId } = useAuth();
  const { accessToken } = useUser();

  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);
  const [selectedContactImage, setSelectedContactImage] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedPropertyTitle, setSelectedPropertyTitle] = useState(null);
  const [selectedAccoImage, setSelectedAccoImage] = useState(null);

  const [message, setMessage] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1280;

  const { contacts, pendingContacts, loading: contactsLoading, setContacts } = useFetchContacts(userId, dashboardType);

  useEffect(() => {
    const messageContext = location.state?.messageContext;
    if (!messageContext || !userId) {
      return;
    }

    if (String(messageContext.contactId || "") === String(userId)) {
      setSelectedContactId(null);
      setSelectedContactName(null);
      setSelectedContactImage(null);
      setSelectedThreadId(null);
      setSelectedPropertyId(null);
      setSelectedPropertyTitle(null);
      setSelectedAccoImage(null);
      return;
    }

    setSelectedContactId(messageContext.contactId || null);
    setSelectedContactName(messageContext.contactName || null);
    setSelectedContactImage(messageContext.contactImage || null);
    setSelectedThreadId(messageContext.threadId || null);
    setSelectedPropertyId(messageContext.propertyId || null);
    setSelectedPropertyTitle(messageContext.propertyTitle || null);
    setSelectedAccoImage(messageContext.accoImage || null);
  }, [location.key, location.state, userId]);

  useEffect(() => {
    if (!userId || !selectedContactId) {
      return;
    }

    const matchedContact = (Array.isArray(contacts) ? contacts : []).find((contact) => {
      const partnerId =
        contact?.partnerId ||
        contact?.recipientId ||
        contact?.userId ||
        (String(contact?.hostId || "") === String(userId) ? contact?.guestId : contact?.hostId) ||
        null;

      if (String(partnerId || "") !== String(selectedContactId)) {
        return false;
      }

      if (!selectedPropertyId) {
        return true;
      }

      return String(contact?.propertyId || contact?.AccoId || "") === String(selectedPropertyId);
    });

    if (!matchedContact) {
      return;
    }

    setSelectedContactName((previousValue) => previousValue || matchedContact?.givenName || matchedContact?.name || null);
    setSelectedContactImage((previousValue) => previousValue || matchedContact?.profileImage || null);
    setSelectedThreadId((previousValue) => previousValue || matchedContact?.threadId || null);
    setSelectedPropertyId((previousValue) => previousValue || matchedContact?.propertyId || matchedContact?.AccoId || null);
    setSelectedPropertyTitle((previousValue) => previousValue || matchedContact?.propertyTitle || matchedContact?.propertyName || null);
    setSelectedAccoImage((previousValue) => previousValue || matchedContact?.accoImage || null);
  }, [contacts, selectedContactId, selectedPropertyId, userId]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleContactClick = (
    contactId,
    contactName,
    contactImage,
    threadId = null,
    propertyId = null,
    propertyTitle = null,
    accoImage = null
  ) => {
    setSelectedContactId(contactId);
    setSelectedContactName(contactName);
    setSelectedContactImage(contactImage || null);
    setSelectedThreadId(threadId);

    setSelectedPropertyId(propertyId || null);
    setSelectedPropertyTitle(propertyTitle || null);
    setSelectedAccoImage(accoImage || null);
  };

  const handleBackToContacts = () => {
    setSelectedContactId(null);
    setSelectedContactName(null);
    setSelectedThreadId(null);

    setSelectedPropertyId(null);
    setSelectedPropertyTitle(null);
    setSelectedAccoImage(null);
  };

  const handleCloseChat = (contactId = null) => {
    if (!contactId || contactId === selectedContactId) {
      setSelectedContactId(null);
      setSelectedContactName(null);
      setSelectedContactImage(null);
      setSelectedThreadId(null);

      setSelectedPropertyId(null);
      setSelectedPropertyTitle(null);
      setSelectedAccoImage(null);
    }
  };

  const handleContactListMessage = (sentMessage) => {
    setMessage(sentMessage);
  };

  const showContactList = isMobile ? !selectedContactId : true;
  const showChatScreen = isMobile ? !!selectedContactId : true;
  const showDetailsPanel = !isMobile && !isTablet;

  return (
    <div className={`${dashboardType}-dashboard-page-body messages-v2`}>
      <WebSocketProvider userId={userId} token={accessToken}>
        {userId ? (
          <>
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
                    onNewMessage={() => setIsNewMessageOpen(true)}
                    activeThreadId={selectedThreadId}
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
                    propertyId={selectedPropertyId}
                    onBack={isTablet ? handleBackToContacts : null}
                    dashboardType={dashboardType}
                  />
                </div>
              )}

              {showDetailsPanel && (
                <ListingPanel
                  dashboardType={dashboardType}
                  propertyId={selectedPropertyId}
                  propertyTitle={selectedPropertyTitle}
                  accoImage={selectedAccoImage}
                />
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
