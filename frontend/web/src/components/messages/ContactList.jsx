import { useState, useEffect, useContext, useMemo } from "react";
import { WebSocketContext } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import ContactItem from "./ContactItem";
import "../../components/messages/messagesV2.scss";
import AutomatedSettings from "./AutomatedSettings";
import { FaCog, FaBars } from "react-icons/fa";

const resolvePartnerId = (contact, selfUserId) => {
  if (!contact) return null;

  const candidates = [
    contact.recipientId,
    contact.userId,
    contact.guestId,
    contact.guestID,
    contact.hostId,
    contact.hostID,
    contact.contactId,
    contact.contactID,
  ].filter(Boolean);

  const picked = candidates.find((id) => id && id !== selfUserId);
  return picked || candidates[0] || null;
};

const isTeamContact = (c) => {
  const raw = `${c?.role || c?.userRole || c?.type || c?.bookingRole || ""}`.toLowerCase();
  return ["team", "cleaner", "maintenance", "staff"].some((k) => raw.includes(k));
};

const buildThreadContext = (contact) => {
  const latest = contact?.latestMessage || {};
  const propertyId =
    contact?.propertyId ||
    contact?.property_id ||
    contact?.accoId ||
    contact?.listingId ||
    latest?.propertyId ||
    latest?.property_id ||
    null;

  const propertyTitle =
    contact?.propertyTitle ||
    contact?.propertyName ||
    contact?.property_name ||
    contact?.accoName ||
    contact?.bookingProperty ||
    latest?.propertyTitle ||
    latest?.propertyName ||
    "";

  const propertyImage =
    contact?.propertyImage ||
    contact?.property_image ||
    contact?.accoImage ||
    contact?.listingImage ||
    latest?.propertyImage ||
    latest?.property_image ||
    null;

  const arrivalDate = contact?.arrivalDate || contact?.checkIn || contact?.arrival_date || latest?.arrivalDate || null;
  const departureDate = contact?.departureDate || contact?.checkOut || contact?.departure_date || latest?.departureDate || null;

  const channel = (contact?.channel || contact?.source || contact?.platform || latest?.channel || latest?.source || "Domits");

  return {
    propertyId,
    propertyTitle,
    propertyImage,
    arrivalDate,
    departureDate,
    channel,
  };
};

const ContactList = ({
  userId,
  onContactClick,
  onCloseChat,
  message,
  dashboardType,
  isChatOpen = false,
  activeContactId = null,

  // NEW (from Messages.js)
  contacts,
  pendingContacts,
  loading,
  setContacts,
}) => {
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [tab, setTab] = useState("all"); // all | guests | team | unread
  const socket = useContext(WebSocketContext);
  const wsMessages = socket?.messages || [];
  const isHost = dashboardType === "host";
  const [automatedSettings, setAutomatedSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, contactId: null });

  useEffect(() => {
    setSelectedContactId(activeContactId || null);
  }, [activeContactId]);

  useEffect(() => {
    const handleClickAway = () => setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    window.addEventListener("click", handleClickAway);
    return () => window.removeEventListener("click", handleClickAway);
  }, []);

  const handleClick = (contact, threadId = null) => {
    const partnerId = resolvePartnerId(contact, userId);
    if (!partnerId) return;

    const ctx = buildThreadContext(contact);

    setSelectedContactId(partnerId);
    onContactClick?.(partnerId, contact?.givenName, contact?.profileImage, threadId, ctx);
  };

  const handleContextMenu = (event, contact) => {
    event.preventDefault();
    const partnerId = resolvePartnerId(contact, userId);
    if (!partnerId) return;

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      contactId: partnerId,
    });
  };

  const handleCloseSelectedChat = () => {
    if (contextMenu.contactId) onCloseChat?.(contextMenu.contactId);
    setContextMenu({ visible: false, x: 0, y: 0, contactId: null });
  };

  // realtime: update latestMessage in contacts list
  useEffect(() => {
    if (!wsMessages?.length) return;

    setContacts?.((prevContacts) => {
      const updatedContacts = Array.isArray(prevContacts) ? [...prevContacts] : [];

      wsMessages.forEach((msg) => {
        const partnerId = msg?.userId === userId ? msg?.recipientId : msg?.userId;
        if (!partnerId) return;

        const idx = updatedContacts.findIndex((c) => resolvePartnerId(c, userId) === partnerId);
        if (idx === -1) return;

        let displayText = msg.text;
        if (msg.fileUrls && msg.fileUrls.length > 0) displayText = "attachment sent";

        updatedContacts[idx] = {
          ...updatedContacts[idx],
          latestMessage: { ...msg, text: displayText },
        };
      });

      updatedContacts.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
      return updatedContacts;
    });
  }, [wsMessages, setContacts, userId]);

  // optimistic sent message -> update latestMessage
  useEffect(() => {
    if (!message) return;

    setContacts?.((prevContacts) => {
      const updatedContacts = Array.isArray(prevContacts) ? [...prevContacts] : [];

      const partnerId = message?.userId === userId ? message?.recipientId : message?.userId;
      if (!partnerId) return updatedContacts;

      const index = updatedContacts.findIndex((c) => resolvePartnerId(c, userId) === partnerId);
      if (index !== -1) {
        let displayText = message.text;
        if (message.fileUrls && message.fileUrls.length > 0) displayText = "attachment sent";

        updatedContacts[index] = {
          ...updatedContacts[index],
          latestMessage: {
            text: displayText,
            createdAt: message.createdAt,
            fileUrls: message.fileUrls,
            userId: message.userId,
            recipientId: message.recipientId,
            propertyId: message?.propertyId || message?.property_id || message?.property?.id || null,
            propertyTitle: message?.propertyTitle || null,
            propertyImage: message?.propertyImage || null,
          },
        };
      }

      updatedContacts.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
      return updatedContacts;
    });
  }, [message, setContacts, userId]);

  const filteredContacts = useMemo(() => {
    let list = Array.isArray(contacts) ? [...contacts] : [];

    if (searchTerm) list = list.filter((c) => (c.givenName || "").toLowerCase().includes(searchTerm.toLowerCase()));

    if (tab === "team") list = list.filter(isTeamContact);
    if (tab === "guests") list = list.filter((c) => !isTeamContact(c));
    if (tab === "unread") list = list.filter((c) => (c.unreadCount || 0) > 0);

    if (sortAlphabetically) {
      list.sort((a, b) => (a.givenName || "").localeCompare(b.givenName || ""));
    } else {
      list.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
    }

    return list;
  }, [contacts, searchTerm, tab, sortAlphabetically]);

  return (
    <div className={`${dashboardType}-contact-list-modal messages-v2-contactlist`}>
      <div className="contactlist-top">
        <input
          className="contactlist-search"
          type="text"
          placeholder="Search or start new chat"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="contactlist-tabs">
          <button className={`contactlist-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
            All
          </button>
          <button className={`contactlist-tab ${tab === "guests" ? "active" : ""}`} onClick={() => setTab("guests")}>
            Guests
          </button>
          <button className={`contactlist-tab ${tab === "team" ? "active" : ""}`} onClick={() => setTab("team")}>
            Team
          </button>
          <button className={`contactlist-tab ${tab === "unread" ? "active" : ""}`} onClick={() => setTab("unread")}>
            Unread
          </button>
        </div>

        <div className="contact-list-side-buttons" style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <FaBars className="contact-list-side-button" onClick={() => setSortAlphabetically((p) => !p)} />
          {isHost && <FaCog className="contact-list-side-button" onClick={() => setAutomatedSettings(true)} />}
          {automatedSettings && <AutomatedSettings setAutomatedSettings={setAutomatedSettings} hostId={userId} />}
        </div>
      </div>

      <ul className="contact-list-list">
        {loading ? (
          <p className="contact-list-loading-text">Loading contacts...</p>
        ) : filteredContacts.length === 0 ? (
          <p className="contact-list-empty-text">No contacts found.</p>
        ) : (
          filteredContacts.map((contact, i) => {
            const partnerId = resolvePartnerId(contact, userId) || `${contact?.userId || "u"}-${i}`;
            const isActive = selectedContactId === partnerId;

            return (
              <li
                key={partnerId}
                className={`contact-list-list-item ${isActive ? "active" : ""}`}
                onClick={() => handleClick(contact, contact.threadId)}
                onContextMenu={(event) => handleContextMenu(event, contact)}
              >
                <ContactItem contact={contact} setContacts={setContacts} userId={userId} selected={isActive} dashboardType={dashboardType} />
              </li>
            );
          })
        )}
      </ul>

      {contextMenu.visible && (
        <div className="contact-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} role="menu">
          <button type="button" onClick={handleCloseSelectedChat}>
            Close chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactList;
