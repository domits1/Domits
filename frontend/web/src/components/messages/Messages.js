import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserProvider, useUser } from "../../features/hostdashboard/hostmessages/context/AuthContext";
import { WebSocketProvider } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import { useAuth } from "../../features/hostdashboard/hostmessages/hooks/useAuth";

import useFetchContacts from "../../features/hostdashboard/hostmessages/hooks/useFetchContacts";

import ContactList from "./ContactList";
import ChatScreen from "./ChatScreen";
import NewContactModal from "./NewContactModal";
import ListingPanel from "./ListingPanel";
import { getMessageCapabilities } from "./messageCapabilities";

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
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { accessToken } = useUser();
  const capabilities = useMemo(() => getMessageCapabilities(dashboardType), [dashboardType]);
  const bookingIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    return params.get("bookingId") || null;
  }, [location.search]);

  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);
  const [selectedContactImage, setSelectedContactImage] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
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

  const syncGuestBookingUrl = (bookingId) => {
    if (dashboardType !== "guest") return;

    const nextSearch = bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : "";
    if ((location.search || "") === nextSearch) return;

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: false, state: null }
    );
  };

  useEffect(() => {
    const messageContext = location.state?.messageContext;
    const contextBookingId = bookingIdFromUrl || messageContext?.bookingId || null;

    if (
      messageContext &&
      bookingIdFromUrl &&
      String(messageContext?.bookingId || "") !== String(bookingIdFromUrl)
    ) {
      setSelectedContactId(null);
      setSelectedContactName(null);
      setSelectedContactImage(null);
      setSelectedThreadId(null);
      setSelectedPropertyId(null);
      setSelectedBookingId(bookingIdFromUrl);
      setSelectedPropertyTitle(null);
      setSelectedAccoImage(null);
      setSelectedPlatform("DOMITS");
      setSelectedIntegrationAccountId(null);
      setSelectedExternalThreadId(null);
      return;
    }

    if (!messageContext || !userId) {
      if (contextBookingId) {
        if (String(selectedBookingId || "") !== String(contextBookingId)) {
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
        setSelectedBookingId(contextBookingId);
      } else if (dashboardType === "guest" && selectedBookingId) {
        setSelectedContactId(null);
        setSelectedContactName(null);
        setSelectedContactImage(null);
        setSelectedThreadId(null);
        setSelectedPropertyId(null);
        setSelectedBookingId(null);
        setSelectedPropertyTitle(null);
        setSelectedAccoImage(null);
        setSelectedPlatform("DOMITS");
        setSelectedIntegrationAccountId(null);
        setSelectedExternalThreadId(null);
      }
      return;
    }

    if (String(messageContext.contactId || "") === String(userId)) {
      setSelectedContactId(null);
      setSelectedContactName(null);
      setSelectedContactImage(null);
      setSelectedThreadId(null);
      setSelectedPropertyId(null);
      setSelectedBookingId(null);
      setSelectedPropertyTitle(null);
      setSelectedAccoImage(null);
      setSelectedPlatform("DOMITS");
      setSelectedIntegrationAccountId(null);
      setSelectedExternalThreadId(null);
      return;
    }

    setSelectedContactId(messageContext.contactId || null);
    setSelectedContactName(messageContext.contactName || null);
    setSelectedContactImage(messageContext.contactImage || null);
    setSelectedThreadId(messageContext.threadId || null);
    setSelectedPropertyId(messageContext.propertyId || null);
    setSelectedBookingId(contextBookingId);
    setSelectedPropertyTitle(messageContext.propertyTitle || null);
    setSelectedAccoImage(messageContext.accoImage || null);
    setSelectedPlatform(messageContext.platform || "DOMITS");
    setSelectedIntegrationAccountId(messageContext.integrationAccountId || null);
    setSelectedExternalThreadId(messageContext.externalThreadId || null);
  }, [bookingIdFromUrl, dashboardType, location.key, location.state, selectedBookingId, userId]);

  useEffect(() => {
    if (!bookingIdFromUrl || !userId || selectedContactId) {
      return;
    }

    const matchedContact = (Array.isArray(contacts) ? contacts : []).find(
      (contact) => String(contact?.bookingId || contact?.bookingid || "") === String(bookingIdFromUrl)
    );

    if (!matchedContact) {
      return;
    }

    const partnerId =
      matchedContact?.partnerId ||
      matchedContact?.recipientId ||
      matchedContact?.userId ||
      (String(matchedContact?.hostId || "") === String(userId) ? matchedContact?.guestId : matchedContact?.hostId) ||
      null;

    if (!partnerId || String(partnerId) === String(userId)) {
      return;
    }

    setSelectedContactId(partnerId);
    setSelectedContactName(matchedContact?.givenName || matchedContact?.name || null);
    setSelectedContactImage(matchedContact?.profileImage || null);
    setSelectedThreadId(matchedContact?.threadId || null);
    setSelectedBookingId(matchedContact?.bookingId || matchedContact?.bookingid || bookingIdFromUrl);
    setSelectedPropertyId(matchedContact?.propertyId || matchedContact?.AccoId || null);
    setSelectedPropertyTitle(matchedContact?.propertyTitle || matchedContact?.propertyName || null);
    setSelectedAccoImage(matchedContact?.accoImage || null);
    setSelectedPlatform(matchedContact?.platform || "DOMITS");
    setSelectedIntegrationAccountId(matchedContact?.integrationAccountId || matchedContact?.externalAccountId || null);
    setSelectedExternalThreadId(matchedContact?.externalThreadId || null);
  }, [bookingIdFromUrl, contacts, selectedContactId, userId]);

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

      if (selectedBookingId) {
        return String(contact?.bookingId || contact?.bookingid || "") === String(selectedBookingId);
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
    setSelectedBookingId((previousValue) => previousValue || matchedContact?.bookingId || matchedContact?.bookingid || null);
    setSelectedPropertyId((previousValue) => previousValue || matchedContact?.propertyId || matchedContact?.AccoId || null);
    setSelectedPropertyTitle(
      (previousValue) => previousValue || matchedContact?.propertyTitle || matchedContact?.propertyName || null
    );
    setSelectedAccoImage((previousValue) => previousValue || matchedContact?.accoImage || null);
    setSelectedPlatform((previousValue) => previousValue || matchedContact?.platform || "DOMITS");
    setSelectedIntegrationAccountId(
      (previousValue) => previousValue || matchedContact?.integrationAccountId || matchedContact?.externalAccountId || null
    );
    setSelectedExternalThreadId(
      (previousValue) => previousValue || matchedContact?.externalThreadId || null
    );
  }, [contacts, selectedBookingId, selectedContactId, selectedPropertyId, userId]);

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
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
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
  }, [accessToken, dashboardType, userId]);

  const handleContactClick = (
    contactId,
    contactName,
    contactImage,
    threadId = null,
    propertyId = null,
    bookingId = null,
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
    setSelectedBookingId(bookingId || null);
    setSelectedPropertyTitle(propertyTitle || null);
    setSelectedAccoImage(accoImage || null);

    setSelectedPlatform(platform || "DOMITS");
    setSelectedIntegrationAccountId(integrationAccountId || null);
    setSelectedExternalThreadId(externalThreadId || null);
    syncGuestBookingUrl(bookingId || null);
  };

  const handleBackToContacts = () => {
    setSelectedContactId(null);
    setSelectedContactName(null);
    setSelectedThreadId(null);

    setSelectedPropertyId(null);
    setSelectedBookingId(null);
    setSelectedPropertyTitle(null);
    setSelectedAccoImage(null);

    setSelectedPlatform("DOMITS");
    setSelectedIntegrationAccountId(null);
    setSelectedExternalThreadId(null);
    syncGuestBookingUrl(null);
  };

  const handleCloseChat = (contactId = null) => {
    if (!contactId || contactId === selectedContactId) {
      setSelectedContactId(null);
      setSelectedContactName(null);
      setSelectedContactImage(null);
      setSelectedThreadId(null);

      setSelectedPropertyId(null);
      setSelectedBookingId(null);
      setSelectedPropertyTitle(null);
      setSelectedAccoImage(null);

      setSelectedPlatform("DOMITS");
      setSelectedIntegrationAccountId(null);
      setSelectedExternalThreadId(null);
      syncGuestBookingUrl(null);
    }
  };

  const handleContactListMessage = (sentMessage) => {
    setMessage(sentMessage);
  };

  const showContactList = isMobile ? !selectedContactId : true;
  const showChatScreen = isMobile ? !!selectedContactId : true;
  const showDetailsPanel = !isMobile && !isTablet && selectedPlatform !== "WHATSAPP" && capabilities.canViewListingPanel;

  const showWhatsAppBanner = useMemo(() => {
    return capabilities.canUseChannelManagement && dashboardType === "host" && !integrationsLoading && !whatsAppConnected;
  }, [capabilities.canUseChannelManagement, dashboardType, integrationsLoading, whatsAppConnected]);

  return (
    <div className={`${dashboardType}-dashboard-page-body messages-v2`}>
      <WebSocketProvider userId={userId} token={accessToken}>
        {userId ? (
          <>
            {capabilities.canCreateContact ? (
              <NewContactModal
                isOpen={isNewMessageOpen}
                onClose={() => setIsNewMessageOpen(false)}
                onCreate={(newContact) => setContacts((prev) => [newContact, ...(Array.isArray(prev) ? prev : [])])}
                userId={userId}
                dashboardType={dashboardType}
              />
            ) : null}

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
                      Link your WhatsApp Business number so you can receive and reply to WhatsApp messages directly
                      from your Domits inbox.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/hostdashboard/integrations-marketplace")}
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
                    onNewMessage={capabilities.canCreateContact ? () => setIsNewMessageOpen(true) : null}
                    activeThreadId={selectedThreadId}
                    capabilities={capabilities}
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
                    bookingId={selectedBookingId}
                    platform={selectedPlatform}
                    integrationAccountId={selectedIntegrationAccountId}
                    externalThreadId={selectedExternalThreadId}
                    onBack={isTablet ? handleBackToContacts : null}
                    dashboardType={dashboardType}
                    capabilities={capabilities}
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
