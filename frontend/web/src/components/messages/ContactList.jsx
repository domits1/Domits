import { useState, useEffect, useContext, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { WebSocketContext } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import ContactItem from "./ContactItem";
import { FaSearch, FaSlidersH, FaPlus } from "react-icons/fa";
import { getMessageCapabilities } from "./messageCapabilities";
import {
  markThreadRead,
  markThreadUnread,
  closeThread,
} from "../../features/hostdashboard/hostmessages/services/messagingService";
import { getIdToken } from "../../services/getAccessToken";

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

const buildRowMenuKey = (contact, selfUserId) => {
  if (contact?.threadId) return contact.threadId;

  const partnerId = resolvePartnerId(contact, selfUserId);
  if (!partnerId) return null;

  const propertyId = contact?.propertyId || contact?.AccoId || "";
  const bookingId = contact?.bookingId || contact?.bookingid || "";
  const platform = String(contact?.platform || "DOMITS").toUpperCase();

  return ["participants", partnerId, propertyId, bookingId, platform].join(":");
};

const resolveContactName = (contact) => {
  if (!contact) return "Unknown";
  const direct = contact.givenName || contact.name || contact.fullName || contact.displayName || contact.contactName;
  if (direct) return direct;
  const first = contact.firstName || contact.first_name;
  const last = contact.lastName || contact.last_name;
  if (first && last) return `${first} ${last}`;
  return first || last || "Unknown";
};

const fetchUserInfo = async (targetUserId) => {
  if (targetUserId) {
    const isLikelyPhone = /^[\d+\-\s()]+$/.test(String(targetUserId));
    if (isLikelyPhone) {
      return { givenName: String(targetUserId), userId: targetUserId, profileImage: null };
    }

    try {
      const userResponse = await fetch("https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ UserId: targetUserId }),
      });

      if (!userResponse.ok) return { givenName: null, userId: targetUserId, profileImage: null };

      const userData = await userResponse.json();

      let parsed = null;
      try {
        parsed = typeof userData?.body === "string" ? JSON.parse(userData.body) : userData?.body;
      } catch {
        parsed = null;
      }

      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      const attrsArr = first?.Attributes;

      if (!Array.isArray(attrsArr)) return { givenName: null, userId: targetUserId, profileImage: null };

      const attributes = attrsArr.reduce((acc, attribute) => {
        if (attribute?.Name) acc[attribute.Name] = attribute.Value;
        return acc;
      }, {});

      const resolvedUserId =
        attributes["sub"] || attributes["userId"] || attrsArr.find((a) => a?.Name === "sub")?.Value || targetUserId;

      return {
        givenName: attributes["given_name"] || attributes["name"] || null,
        userId: resolvedUserId,
        profileImage: attributes["picture"] || null,
      };
    } catch {
      return { givenName: null, userId: targetUserId, profileImage: null };
    }
  }
  return { givenName: null, userId: targetUserId, profileImage: null };
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

  const isFromCurrentUser = String(incoming?.userId ?? incoming?.senderId) === String(selfUserId);
  const isAddressedToCurrentUser = String(incoming?.recipientId) === String(selfUserId);
  const isGenuineIncoming = !isFromCurrentUser && isAddressedToCurrentUser;

  const hasExisting = idx > -1;
  if (hasExisting) {
    const previousUnreadCount = updated[idx]?.unreadCount || 0;
    const nextUnreadCount = isGenuineIncoming ? previousUnreadCount + 1 : previousUnreadCount;

    updated[idx] = {
      ...updated[idx],
      latestMessage: { ...incoming, text: displayText },
      platform: incoming?.platform || updated[idx]?.platform || "DOMITS",
      integrationAccountId: incoming?.integrationAccountId || updated[idx]?.integrationAccountId || null,
      externalThreadId: incoming?.externalThreadId || updated[idx]?.externalThreadId || null,
      unreadCount: nextUnreadCount,
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
      platform: incoming?.platform || "DOMITS",
      integrationAccountId: incoming?.integrationAccountId || null,
      externalThreadId: incoming?.externalThreadId || null,
      channelLabel: incoming?.platform === "WHATSAPP" ? "WhatsApp" : incoming?.platform || null,
      isWhatsApp: String(incoming?.platform || "").toUpperCase() === "WHATSAPP",
      unreadCount: isGenuineIncoming ? 1 : 0,
    });
  }

  updated.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
  return updated;
};

const markContactThreadReadLocally = (prevContacts, threadId, updatedCount) =>
  (Array.isArray(prevContacts) ? prevContacts : []).map((c) =>
    c?.threadId && String(c.threadId) === String(threadId)
      ? { ...c, unreadCount: Math.max(0, (c.unreadCount || 0) - (updatedCount || 0)) }
      : c
  );

const markContactThreadUnreadLocally = (prevContacts, threadId, updatedCount) =>
  (Array.isArray(prevContacts) ? prevContacts : []).map((c) =>
    c?.threadId && String(c.threadId) === String(threadId)
      ? { ...c, unreadCount: (c.unreadCount || 0) + updatedCount }
      : c
  );

const markContactThreadClosedLocally = (prevContacts, threadId) =>
  (Array.isArray(prevContacts) ? prevContacts : []).map((c) =>
    c?.threadId && String(c.threadId) === String(threadId) ? { ...c, status: "CLOSED" } : c
  );

const hydratePartnerInContacts = ({ setContacts, selfUserId, partnerId, info }) => {
  setContacts?.((prevContacts) => {
    const updated = Array.isArray(prevContacts) ? [...prevContacts] : [];
    const idx = updated.findIndex((c) => String(resolvePartnerId(c, selfUserId)) === String(partnerId));
    if (idx === -1) return updated;

    const existingName = resolveContactName(updated[idx]);
    const resolvedInfoName =
      info?.givenName && info.givenName !== "Unknown" && info.givenName.trim().length > 0 ? info.givenName : null;
    updated[idx] = {
      ...updated[idx],
      givenName: resolvedInfoName || existingName || "Unknown",
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
  capabilities: providedCapabilities = null,
}) => {
  const capabilities = providedCapabilities || getMessageCapabilities(dashboardType);
  const [selectedKey, setSelectedKey] = useState(null);
  const [tab, setTab] = useState("all");
  const socket = useContext(WebSocketContext);
  const wsMessages = socket?.messages || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, contactKey: null, contact: null });

  const hydratingIdsRef = useRef(new Set());
  const lastWsMessageIdRef = useRef(null);
  const lastPropMessageIdRef = useRef(null);
  const activeThreadIdRef = useRef(activeThreadId);
  const activeContactIdRef = useRef(activeContactId);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

  const processIncomingMessage = useCallback(
    (incoming) => {
      if (!incoming) return;

      const partnerId = incoming?.userId === userId ? incoming?.recipientId : incoming?.userId;
      if (!partnerId || String(partnerId) === String(userId)) return;

      const incomingThreadId = incoming?.threadId || null;
      const isActiveThread = incomingThreadId
        ? String(incomingThreadId) === String(activeThreadIdRef.current || "")
        : String(partnerId) === String(activeContactIdRef.current || "");

      setContacts?.((prevContacts) => upsertContactFromIncoming({ prevContacts, selfUserId: userId, incoming }));

      const isFromCurrentUser = String(incoming?.userId ?? incoming?.senderId) === String(userId);
      const isAddressedToCurrentUser = String(incoming?.recipientId) === String(userId);
      if (!isFromCurrentUser && isAddressedToCurrentUser && isActiveThread && incomingThreadId) {
        getIdToken()
          .then((idToken) => markThreadRead(incomingThreadId, idToken))
          .then((result) => {
            setContacts?.((prevContacts) =>
              markContactThreadReadLocally(prevContacts, incomingThreadId, result?.updated ?? 0)
            );
          })
          .catch(() => {
            toast.error("Could not mark this conversation as read. Please try again.");
          });
      }

      const hydrateKey = String(partnerId);
      if (hydratingIdsRef.current.has(hydrateKey)) return;
      hydratingIdsRef.current.add(hydrateKey);

      const runHydrate = async () => {
        const info = await fetchUserInfo(partnerId);
        hydratePartnerInContacts({ setContacts, selfUserId: userId, partnerId, info });

        hydratingIdsRef.current.delete(hydrateKey);
      };

      runHydrate();
    },
    [setContacts, userId]
  );

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
      resolveContactName(contact),
      contact?.profileImage,
      threadId,
      contact?.propertyId || contact?.AccoId || null,
      contact?.bookingId || contact?.bookingid || null,
      contact?.propertyTitle || contact?.propertyName || null,
      contact?.accoImage || null,
      contact?.platform || "DOMITS",
      contact?.integrationAccountId || null,
      contact?.externalThreadId || null
    );
  };

  const handleContextMenu = (event, contact) => {
    if (!capabilities.canManageConversation) return;
    event.preventDefault();
    event.stopPropagation();
    const partnerId = resolvePartnerId(contact, userId);
    if (!partnerId) return;

    const key = buildRowMenuKey(contact, userId);
    setContextMenu({ visible: true, contactKey: key, contact });
  };

  const handleCloseSelectedChat = async () => {
    const contact = contextMenu.contact;
    const partnerId = resolvePartnerId(contact, userId);
    const threadId = contact?.threadId;
    if (partnerId) onCloseChat?.(partnerId);
    setContextMenu({ visible: false, contactKey: null, contact: null });
    if (!threadId) return;

    try {
      const idToken = await getIdToken();
      await closeThread(threadId, idToken);
      setContacts?.((prevContacts) => markContactThreadClosedLocally(prevContacts, threadId));
    } catch {
      toast.error("Could not close this conversation. Please try again.");
    }
  };

  const handleMarkAsRead = async () => {
    const threadId = contextMenu.contact?.threadId;
    setContextMenu({ visible: false, contactKey: null, contact: null });
    if (!threadId) return;

    try {
      const idToken = await getIdToken();
      const result = await markThreadRead(threadId, idToken);
      setContacts?.((prevContacts) => markContactThreadReadLocally(prevContacts, threadId, result?.updated ?? 0));
    } catch {
      toast.error("Could not mark this conversation as read. Please try again.");
    }
  };

  const handleMarkAsUnread = async () => {
    const threadId = contextMenu.contact?.threadId;
    setContextMenu({ visible: false, contactKey: null, contact: null });
    if (!threadId) return;

    try {
      const idToken = await getIdToken();
      const result = await markThreadUnread(threadId, idToken);

      if (String(activeThreadIdRef.current || "") === String(threadId)) {
        try {
          const readResult = await markThreadRead(threadId, idToken);
          setContacts?.((prevContacts) =>
            markContactThreadReadLocally(prevContacts, threadId, readResult?.updated ?? 0)
          );
        } catch {
          setContacts?.((prevContacts) => markContactThreadUnreadLocally(prevContacts, threadId, result?.updated ?? 0));
          toast.error("Could not reopen this conversation as read. Please try again.");
        }
        return;
      }

      setContacts?.((prevContacts) => markContactThreadUnreadLocally(prevContacts, threadId, result?.updated ?? 0));
    } catch {
      toast.error("Could not mark this conversation as unread. Please try again.");
    }
  };

  useEffect(() => {
    if (!wsMessages?.length) return;

    const latest = wsMessages[wsMessages.length - 1];
    if (!latest) return;
    const messageId = latest?.id || latest?.message?.id || JSON.stringify(latest);
    if (lastWsMessageIdRef.current === messageId) return;
    lastWsMessageIdRef.current = messageId;
    processIncomingMessage(latest);
  }, [wsMessages, processIncomingMessage]);

  useEffect(() => {
    if (!message) return;
    const messageId = message?.id || JSON.stringify(message);
    if (lastPropMessageIdRef.current === messageId) return;
    lastPropMessageIdRef.current = messageId;
    processIncomingMessage(message);
  }, [message, processIncomingMessage]);

  const filteredContacts = useMemo(() => {
    let list = Array.isArray(contacts) ? [...contacts] : [];

    if (capabilities.canSearch && searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const nameMatches = resolveContactName(c).toLowerCase().includes(term);
        const bookingIdMatches = String(c?.bookingId ?? "").toLowerCase().includes(term);
        return nameMatches || bookingIdMatches;
      });
    }
    if (capabilities.canFilterByReadStatus && tab === "unread") {
      list = list.filter((c) => (c.unreadCount || 0) > 0);
    }

    if (capabilities.canSort && sortAlphabetically) {
      list.sort((a, b) => resolveContactName(a).localeCompare(resolveContactName(b)));
    } else {
      list.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
    }

    return list;
  }, [capabilities, contacts, searchTerm, tab, sortAlphabetically]);

  let listContent = null;
  if (loading) {
    listContent = <p className="contact-list-loading-text">Loading contacts...</p>;
  } else if (filteredContacts.length === 0) {
    listContent = <p className="contact-list-empty-text">No contacts found.</p>;
  } else {
    listContent = filteredContacts.map((contact) => {
      const partnerId = resolvePartnerId(contact, userId);
      const fallbackKey =
        contact?.id ||
        contact?.latestMessage?.id ||
        `${contact?.latestMessage?.createdAt || "unknown"}-${resolveContactName(contact)}`;
      const activeKey = contact?.threadId || partnerId || fallbackKey;
      const key = buildRowMenuKey(contact, userId) || fallbackKey;
      const isActive = selectedKey === activeKey;
      const isMenuOpenForRow = capabilities.canManageConversation && contextMenu.visible && contextMenu.contactKey === key;

      return (
        <li
          key={key}
          className={`contact-list-list-item ${isActive ? "active" : ""}`}
          onClick={() => handleClick(contact)}
          onContextMenu={capabilities.canManageConversation ? (event) => handleContextMenu(event, contact) : undefined}
          style={{ cursor: "pointer" }}
        >
          <ContactItem
            contact={contact}
            selected={isActive}
            onActionsClick={
              capabilities.canManageConversation ? (event) => handleContextMenu(event, contact) : undefined
            }
          />

          {isMenuOpenForRow && (
            <div className="contact-context-menu" role="menu">
              {(contextMenu.contact?.unreadCount || 0) > 0 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleMarkAsRead();
                  }}
                >
                  Mark as read
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleMarkAsUnread();
                  }}
                >
                  Mark as unread
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCloseSelectedChat();
                }}
              >
                Close chat
              </button>
            </div>
          )}
        </li>
      );
    });
  }

  return (
    <div className="messages-v2-contactlist">
      <div className="contactlist-top">
        <div className="contactlist-titlebar">
          <h2 className="contactlist-title">Messages</h2>

          <div className="contactlist-actions">
            {capabilities.canSearch ? (
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
            ) : null}

            {capabilities.canSort ? (
              <button
                type="button"
                className="icon-btn"
                title={sortAlphabetically ? "Sort by latest" : "Sort A-Z"}
                onClick={() => setSortAlphabetically((p) => !p)}
              >
                <FaSlidersH />
              </button>
            ) : null}

            {capabilities.canCreateContact ? (
              <button type="button" className="icon-btn primary" title="New message" onClick={onNewMessage}>
                <FaPlus />
              </button>
            ) : null}
          </div>
        </div>

        {capabilities.canSearch ? (
          <input
            className="contactlist-search"
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        ) : null}

        {capabilities.canFilterByReadStatus ? (
          <div className="contactlist-tabs">
            <button className={`contactlist-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
              All
            </button>
            <button className={`contactlist-tab ${tab === "unread" ? "active" : ""}`} onClick={() => setTab("unread")}>
              Unread
            </button>
          </div>
        ) : null}
      </div>

      <ul className="contact-list-list">{listContent}</ul>
    </div>
  );
};

ContactList.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onContactClick: PropTypes.func,
  onCloseChat: PropTypes.func,
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    senderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    text: PropTypes.string,
    content: PropTypes.string,
    fileUrls: PropTypes.arrayOf(PropTypes.string),
    platform: PropTypes.string,
    integrationAccountId: PropTypes.string,
    externalThreadId: PropTypes.string,
  }),
  dashboardType: PropTypes.string,
  isChatOpen: PropTypes.bool,
  activeContactId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  contacts: PropTypes.arrayOf(PropTypes.object),
  pendingContacts: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  setContacts: PropTypes.func,
  onNewMessage: PropTypes.func,
  activeThreadId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  capabilities: PropTypes.object,
};

export default ContactList;
