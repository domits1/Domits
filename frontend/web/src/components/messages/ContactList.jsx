import { useState, useEffect, useContext, useMemo } from "react";
import { WebSocketContext } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import ContactItem from "./ContactItem";
import { FaSearch, FaSlidersH, FaPlus } from "react-icons/fa";

const resolvePartnerId = (contact, selfUserId) => {
  if (!contact) return null;

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

const GetUserInfo = async (targetUserId) => {
  if (!targetUserId) return { givenName: "Unknown", userId: targetUserId };

  try {
    const userResponse = await fetch("https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserId: targetUserId }),
    });

    if (!userResponse.ok) return { givenName: "Unknown", userId: targetUserId };

    const userData = await userResponse.json();

    let parsed = null;
    try {
      parsed = typeof userData?.body === "string" ? JSON.parse(userData.body) : userData?.body;
    } catch {
      parsed = null;
    }

    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    const attrsArr = first?.Attributes;

    if (!Array.isArray(attrsArr)) return { givenName: "Unknown", userId: targetUserId };

    const attributes = attrsArr.reduce((acc, attribute) => {
      if (attribute?.Name) acc[attribute.Name] = attribute.Value;
      return acc;
    }, {});

    const resolvedUserId =
      attributes["sub"] || attributes["userId"] || attrsArr.find((a) => a?.Name === "sub")?.Value || targetUserId;

    return {
      givenName: attributes["given_name"] || attributes["name"] || "Unknown",
      userId: resolvedUserId,
      profileImage: attributes["picture"] || null,
    };
  } catch {
    return { givenName: "Unknown", userId: targetUserId };
  }
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

  activeThreadId = null,
}) => {
  const [selectedKey, setSelectedKey] = useState(null);
  const [tab, setTab] = useState("all");
  const socket = useContext(WebSocketContext);
  const wsMessages = socket?.messages || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, contactKey: null });

  // avoid repeatedly fetching same new user info
  const [hydratingIds, setHydratingIds] = useState(() => new Set());

  useEffect(() => {
    const key = activeThreadId || activeContactId || null;
    setSelectedKey(key);
  }, [activeContactId, activeThreadId]);

  useEffect(() => {
    const handleClickAway = () => setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    window.addEventListener("click", handleClickAway);
    return () => window.removeEventListener("click", handleClickAway);
  }, []);

  const handleClick = (contact) => {
    const partnerId = resolvePartnerId(contact, userId);
    if (!partnerId) return;

    const threadId = contact?.threadId || null;
    setSelectedKey(threadId || partnerId);

    onContactClick?.(
      partnerId,
      contact?.givenName,
      contact?.profileImage,
      threadId,
      contact?.propertyId || contact?.AccoId || null,
      contact?.propertyTitle || contact?.propertyName || null,
      contact?.accoImage || null
    );
  };

  const handleContextMenu = (event, contact) => {
    event.preventDefault();
    const partnerId = resolvePartnerId(contact, userId);
    if (!partnerId) return;
    const key = contact?.threadId || partnerId;

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      contactKey: key,
    });
  };

  const handleCloseSelectedChat = () => {
    if (contextMenu.contactKey) onCloseChat?.(activeContactId);
    setContextMenu({ visible: false, x: 0, y: 0, contactKey: null });
  };

  // ✅ REALTIME: update existing contact OR create a new contact row immediately
  useEffect(() => {
    if (!wsMessages?.length) return;

    const latest = wsMessages[wsMessages.length - 1];
    if (!latest) return;

    const threadId = latest?.threadId || null;
    const partnerId = latest?.userId === userId ? latest?.recipientId : latest?.userId;
    if (!partnerId || String(partnerId) === String(userId)) return;

    let displayText = latest.text;
    if (latest.fileUrls && latest.fileUrls.length > 0) displayText = "Attachment";

    // 1) Insert/update synchronously
    setContacts?.((prevContacts) => {
      const updated = Array.isArray(prevContacts) ? [...prevContacts] : [];

      const idx = updated.findIndex((c) => {
        if (threadId && c?.threadId) return String(c.threadId) === String(threadId);
        return resolvePartnerId(c, userId) === partnerId;
      });

      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          latestMessage: { ...latest, text: displayText },
        };
      } else {
        // Create a placeholder contact so it appears instantly without refresh
        updated.unshift({
          partnerId,
          recipientId: partnerId,
          userId: partnerId,
          threadId: threadId || null,
          propertyId: latest?.propertyId || null,
          propertyTitle: null,
          accoImage: null,
          givenName: "New message",
          profileImage: null,
          latestMessage: { ...latest, text: displayText },
          isFromRealtime: true,
        });
      }

      updated.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
      return updated;
    });

    // 2) Hydrate user name/profile for new contacts (async, safe)
    const hydrateKey = String(partnerId);
    if (!hydratingIds.has(hydrateKey)) {
      setHydratingIds((prev) => {
        const next = new Set(prev);
        next.add(hydrateKey);
        return next;
      });

      (async () => {
        const info = await GetUserInfo(partnerId);

        setContacts?.((prevContacts) => {
          const updated = Array.isArray(prevContacts) ? [...prevContacts] : [];

          const idx = updated.findIndex((c) => String(resolvePartnerId(c, userId)) === String(partnerId));
          if (idx === -1) return updated;

          updated[idx] = {
            ...updated[idx],
            givenName: info?.givenName || updated[idx]?.givenName || "Unknown",
            profileImage: updated[idx]?.profileImage || info?.profileImage || null,
          };

          return updated;
        });

        setHydratingIds((prev) => {
          const next = new Set(prev);
          next.delete(hydrateKey);
          return next;
        });
      })();
    }
  }, [wsMessages, setContacts, userId, hydratingIds]);

  // keep existing local-send updating logic
  useEffect(() => {
    if (!message) return;

    setContacts?.((prevContacts) => {
      const updatedContacts = Array.isArray(prevContacts) ? [...prevContacts] : [];

      const threadId = message?.threadId || null;
      const partnerId = message?.userId === userId ? message?.recipientId : message?.userId;
      if (!partnerId || String(partnerId) === String(userId)) return updatedContacts;

      const index = updatedContacts.findIndex((c) => {
        if (threadId && c?.threadId) return String(c.threadId) === String(threadId);
        return resolvePartnerId(c, userId) === partnerId;
      });

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
            threadId: message.threadId || updatedContacts[index]?.threadId || null,
          },
        };
      } else {
        updatedContacts.unshift({
          partnerId,
          recipientId: partnerId,
          userId: partnerId,
          threadId: message?.threadId || null,
          propertyId: message?.propertyId || null,
          givenName: "New message",
          profileImage: null,
          latestMessage: {
            text: message.text || "",
            createdAt: message.createdAt,
            userId: message.userId,
            recipientId: message.recipientId,
            threadId: message.threadId || null,
          },
        });
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
            const key = contact?.threadId || partnerId || `fallback-${i}`;
            const isActive = selectedKey === key;

            return (
              <li
                key={key}
                className={`contact-list-list-item ${isActive ? "active" : ""}`}
                onClick={() => handleClick(contact)}
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