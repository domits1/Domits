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

const fetchUserInfo = async (targetUserId) => {
  if (!targetUserId) return { givenName: "Unknown", userId: targetUserId, profileImage: null };

  try {
    const userResponse = await fetch("https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserId: targetUserId }),
    });

    if (!userResponse.ok) return { givenName: "Unknown", userId: targetUserId, profileImage: null };

    const userData = await userResponse.json();

    let parsed = null;
    try {
      parsed = typeof userData?.body === "string" ? JSON.parse(userData.body) : userData?.body;
    } catch {
      parsed = null;
    }

    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    const attrsArr = first?.Attributes;

    if (!Array.isArray(attrsArr)) return { givenName: "Unknown", userId: targetUserId, profileImage: null };

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
    return { givenName: "Unknown", userId: targetUserId, profileImage: null };
  }
};

const upsertContactFromIncoming = ({ prevContacts, selfUserId, incoming }) => {
  const updated = Array.isArray(prevContacts) ? [...prevContacts] : [];

  const threadId = incoming?.threadId || null;
  const partnerId = incoming?.userId === selfUserId ? incoming?.recipientId : incoming?.userId;

  if (!partnerId || String(partnerId) === String(selfUserId)) return updated;

  let displayText = incoming?.text ?? incoming?.content ?? "";
  if (incoming?.fileUrls && incoming.fileUrls.length > 0) displayText = "Attachment";

  const idx = updated.findIndex((c) => {
    if (threadId && c?.threadId) return String(c.threadId) === String(threadId);
    return resolvePartnerId(c, selfUserId) === partnerId;
  });

  if (idx !== -1) {
    updated[idx] = {
      ...updated[idx],
      latestMessage: { ...incoming, text: displayText },
    };
  } else {
    updated.unshift({
      partnerId,
      recipientId: partnerId,
      userId: partnerId,
      threadId: threadId || null,
      propertyId: incoming?.propertyId || null,
      propertyTitle: null,
      accoImage: null,
      givenName: "New message",
      profileImage: null,
      latestMessage: { ...incoming, text: displayText },
      isFromRealtime: true,
    });
  }

  updated.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
  return updated;
};

const hydratePartnerInContacts = ({ setContacts, selfUserId, partnerId, info }) => {
  setContacts?.((prevContacts) => {
    const updated = Array.isArray(prevContacts) ? [...prevContacts] : [];
    const idx = updated.findIndex((c) => String(resolvePartnerId(c, selfUserId)) === String(partnerId));
    if (idx === -1) return updated;

    updated[idx] = {
      ...updated[idx],
      givenName: info?.givenName || updated[idx]?.givenName || "Unknown",
      profileImage: updated[idx]?.profileImage || info?.profileImage || null,
    };

    return updated;
  });
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
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, contactKey: key });
  };

  const handleCloseSelectedChat = () => {
    if (contextMenu.contactKey) onCloseChat?.(activeContactId);
    setContextMenu({ visible: false, x: 0, y: 0, contactKey: null });
  };

  useEffect(() => {
    if (!wsMessages?.length) return;

    const latest = wsMessages[wsMessages.length - 1];
    if (!latest) return;

    const partnerId = latest?.userId === userId ? latest?.recipientId : latest?.userId;
    if (!partnerId || String(partnerId) === String(userId)) return;

    setContacts?.((prevContacts) => upsertContactFromIncoming({ prevContacts, selfUserId: userId, incoming: latest }));

    const hydrateKey = String(partnerId);
    if (hydratingIds.has(hydrateKey)) return;

    setHydratingIds((prev) => {
      const next = new Set(prev);
      next.add(hydrateKey);
      return next;
    });

    const runHydrate = async () => {
      const info = await fetchUserInfo(partnerId);
      hydratePartnerInContacts({ setContacts, selfUserId: userId, partnerId, info });

      setHydratingIds((prev) => {
        const next = new Set(prev);
        next.delete(hydrateKey);
        return next;
      });
    };

    runHydrate();
  }, [wsMessages, setContacts, userId, hydratingIds]);

  useEffect(() => {
    if (!message) return;

    const partnerId = message?.userId === userId ? message?.recipientId : message?.userId;
    if (!partnerId || String(partnerId) === String(userId)) return;

    setContacts?.((prevContacts) => upsertContactFromIncoming({ prevContacts, selfUserId: userId, incoming: message }));

    const hydrateKey = String(partnerId);
    if (hydratingIds.has(hydrateKey)) return;

    setHydratingIds((prev) => {
      const next = new Set(prev);
      next.add(hydrateKey);
      return next;
    });

    const runHydrate = async () => {
      const info = await fetchUserInfo(partnerId);
      hydratePartnerInContacts({ setContacts, selfUserId: userId, partnerId, info });

      setHydratingIds((prev) => {
        const next = new Set(prev);
        next.delete(hydrateKey);
        return next;
      });
    };

    runHydrate();
  }, [message, setContacts, userId, hydratingIds]);

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