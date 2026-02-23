import { useState, useEffect, useContext, useMemo } from "react";
import { WebSocketContext } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import ContactItem from "./ContactItem";
import { FaSearch, FaSlidersH, FaPlus } from "react-icons/fa";

const resolvePartnerId = (contact, selfUserId) => {
  if (!contact) return null;

  // NEW: first-class partnerId
  const direct = contact?.partnerId;
  if (direct && String(direct) !== String(selfUserId)) return direct;

  const latest = contact?.latestMessage || null;

  const candidates = [
    contact.recipientId,
    contact.userId,
    contact.hostId,
    contact.guestId,
    latest?.senderId,
    latest?.userId,
    latest?.recipientId,
  ].filter(Boolean);

  const picked = candidates.find((id) => String(id) !== String(selfUserId));
  return picked || null;
};

const ContactList = ({
  userId,
  onContactClick,
  onCloseChat,
  message,
  dashboardType,
  isChatOpen = false,
  activeContactId = null,

  contacts,
  pendingContacts,
  loading,
  setContacts,

  onNewMessage,
}) => {
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [tab, setTab] = useState("all"); // all | unread
  const socket = useContext(WebSocketContext);
  const wsMessages = socket?.messages || [];

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

    if (!partnerId) {
      console.warn("[ContactList] Could not resolve partnerId for contact:", contact);
      return;
    }

    setSelectedContactId(partnerId);
    onContactClick?.(partnerId, contact?.givenName, contact?.profileImage, threadId || contact?.threadId || null);
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
        if (!partnerId || String(partnerId) === String(userId)) return;

        const idx = updatedContacts.findIndex((c) => resolvePartnerId(c, userId) === partnerId);
        if (idx === -1) return;

        let displayText = msg.text;
        if (msg.fileUrls && msg.fileUrls.length > 0) displayText = "Attachment";

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
      if (!partnerId || String(partnerId) === String(userId)) return updatedContacts;

      const index = updatedContacts.findIndex((c) => resolvePartnerId(c, userId) === partnerId);
      if (index !== -1) {
        let displayText = message.text;
        if (message.fileUrls && message.fileUrls.length > 0) displayText = "Attachment";

        updatedContacts[index] = {
          ...updatedContacts[index],
          latestMessage: {
            text: displayText,
            createdAt: message.createdAt,
            fileUrls: message.fileUrls,
            userId: message.userId,
            recipientId: message.recipientId,
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
    if (tab === "unread") list = list.filter((c) => (c.unreadCount || 0) > 0);

    if (sortAlphabetically) {
      list.sort((a, b) => (a.givenName || "").localeCompare(b.givenName || ""));
    } else {
      list.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
    }

    return list;
  }, [contacts, searchTerm, tab, sortAlphabetically]);

  return (
    <div className="messages-v2-contactlist">
      <div className="contactlist-top">
        <div className="contactlist-titlebar">
          <h2 className="contactlist-title">Messages</h2>

          <div className="contactlist-actions">
            <button
              type="button"
              className="icon-btn"
              title="Search"
              onClick={() => {
                const el = document.querySelector(".contactlist-search");
                if (el) el.focus();
              }}
            >
              <FaSearch />
            </button>

            <button
              type="button"
              className="icon-btn"
              title={sortAlphabetically ? "Sort by latest" : "Sort A–Z"}
              onClick={() => setSortAlphabetically((p) => !p)}
            >
              <FaSlidersH />
            </button>

            <button type="button" className="icon-btn primary" title="New message" onClick={onNewMessage}>
              <FaPlus />
            </button>
          </div>
        </div>

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
          <button className={`contactlist-tab ${tab === "unread" ? "active" : ""}`} onClick={() => setTab("unread")}>
            Unread
          </button>
        </div>
      </div>

      <ul className="contact-list-list">
        {loading ? (
          <p className="contact-list-loading-text">Loading contacts...</p>
        ) : filteredContacts.length === 0 ? (
          <p className="contact-list-empty-text">No contacts found.</p>
        ) : (
          filteredContacts.map((contact, i) => {
            const partnerId = resolvePartnerId(contact, userId) || `unknown-${i}`;
            const isActive = selectedContactId === partnerId;

            return (
              <li
                key={partnerId}
                className={`contact-list-list-item ${isActive ? "active" : ""}`}
                onClick={() => handleClick(contact, contact.threadId)}
                onContextMenu={(event) => handleContextMenu(event, contact)}
                style={{ cursor: "pointer" }}
              >
                <ContactItem contact={contact} selected={isActive} />
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
