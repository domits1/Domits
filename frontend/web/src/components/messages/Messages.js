import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserProvider, useUser } from "../../features/hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../../features/hostdashboard/hostmessages/hooks/useAuth";

import useFetchContacts from "../../features/hostdashboard/hostmessages/hooks/useFetchContacts";

import ContactList from "./ContactList";
import ChatScreen from "./ChatScreen";
import NewContactModal from "./NewContactModal";
import ListingPanel from "./ListingPanel";

import "./messagesV2.scss";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const Messages = ({ dashboardType }) => {
  return (
    <UserProvider>
      <MessagesContent dashboardType={dashboardType} />
    </UserProvider>
  );
};

const MessagesContent = ({ dashboardType }) => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { accessToken } = useUser();

  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);
  const [selectedContactImage, setSelectedContactImage] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedPropertyTitle, setSelectedPropertyTitle] = useState(null);
  const [selectedAccoImage, setSelectedAccoImage] = useState(null);

  const [selectedPlatform, setSelectedPlatform] = useState("DOMITS");
  const [selectedIntegrationAccountId, setSelectedIntegrationAccountId] = useState(null);
  const [selectedExternalThreadId, setSelectedExternalThreadId] = useState(null);

  const [message, setMessage] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1280;

  const { contacts, pendingContacts, loading: contactsLoading, setContacts } = useFetchContacts(userId, dashboardType);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (dashboardType !== "host" || !userId) {
        setIntegrationsLoading(false);
        setWhatsAppConnected(false);
        return;
      }

      setIntegrationsLoading(true);

      try {
        const res = await fetch(`${UNIFIED_API}/integrations?userId=${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error("Failed to fetch integrations");

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        const hasWhatsApp = list.some(
          (item) =>
            String(item?.channel || "").toUpperCase() === "WHATSAPP" &&
            !!String(item?.externalAccountId || "").trim()
        );

        if (!cancelled) {
          setWhatsAppConnected(hasWhatsApp);
        }
      } catch {
        if (!cancelled) {
          setWhatsAppConnected(false);
        }
      } finally {
        if (!cancelled) {
          setIntegrationsLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [dashboardType, userId]);

  const handleContactClick = (
    contactId,
    contactName,
    contactImage,
    threadId = null,
    propertyId = null,
    propertyTitle = null,
    accoImage = null,
    platform = "DOMITS",
    integrationAccountId = null,
    externalThreadId = null
  ) => {
    setSelectedContactId(contactId);
    setSelectedContactName(contactName);
    setSelectedContactImage(contactImage || null);
    setSelectedThreadId(threadId);

    setSelectedPropertyId(propertyId || null);
    setSelectedPropertyTitle(propertyTitle || null);
    setSelectedAccoImage(accoImage || null);

    setSelectedPlatform(platform || "DOMITS");
    setSelectedIntegrationAccountId(integrationAccountId || null);
    setSelectedExternalThreadId(externalThreadId || null);
  };

  const handleBackToContacts = () => {
    setSelectedContactId(null);
    setSelectedContactName(null);
    setSelectedThreadId(null);

    setSelectedPropertyId(null);
    setSelectedPropertyTitle(null);
    setSelectedAccoImage(null);

    setSelectedPlatform("DOMITS");
    setSelectedIntegrationAccountId(null);
    setSelectedExternalThreadId(null);
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

      setSelectedPlatform("DOMITS");
      setSelectedIntegrationAccountId(null);
      setSelectedExternalThreadId(null);
    }
  };

  const handleContactListMessage = (sentMessage) => {
    setMessage(sentMessage);
  };

  const showContactList = isMobile ? !selectedContactId : true;
  const showChatScreen = isMobile ? !!selectedContactId : true;
  const showDetailsPanel = !isMobile && !isTablet && selectedPlatform !== "WHATSAPP";

  const showWhatsAppBanner = useMemo(() => {
    return dashboardType === "host" && !integrationsLoading && !whatsAppConnected;
  }, [dashboardType, integrationsLoading, whatsAppConnected]);

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

            {showWhatsAppBanner ? (
              <div
                style={{
                  marginBottom: "18px",
                  background: "#ffffff",
                  border: "1px solid #d9e7dd",
                  borderRadius: "16px",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                  padding: "20px 22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "16px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#15803d",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      WhatsApp
                    </p>
                    <h3 style={{ margin: "6px 0 4px", fontSize: "22px" }}>Connect your WhatsApp Business</h3>
                    <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.55, maxWidth: "760px" }}>
                      Link your WhatsApp Business number so hosts can receive and reply to WhatsApp messages directly
                      from the Domits inbox.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/hostdashboard/integrations")}
                    style={{
                      border: 0,
                      borderRadius: "12px",
                      padding: "12px 16px",
                      background: "#15803d",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Connect WhatsApp
                  </button>
                </div>
              </div>
            ) : null}

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
                    platform={selectedPlatform}
                    integrationAccountId={selectedIntegrationAccountId}
                    externalThreadId={selectedExternalThreadId}
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