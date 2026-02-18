// /Users/mh/Domits/frontend/web/src/components/messages/ChatScreen.jsx

import { useEffect, useMemo, useState, useRef, useContext } from "react";

import useFetchMessages from "../../features/hostdashboard/hostmessages/hooks/useFetchMessages";
import useFetchBookingDetails from "../../features/hostdashboard/hostmessages/hooks/useFetchBookingDetails";
import { useSendMessage } from "../../features/hostdashboard/hostmessages/hooks/useSendMessage";

import ChatMessage from "./ChatMessage";
import ChatUploadAttachment from "../../features/hostdashboard/hostmessages/components/chatUploadAttachment";
import { WebSocketContext } from "../../features/hostdashboard/hostmessages/context/webSocketContext";

// Keep existing styles for now (safe). The new look comes from messagesV2.scss (scoped by .messages-v2)
import "../../features/hostdashboard/hostmessages/styles/sass/chatscreen/hostChatScreen.scss";

import { v4 as uuidv4 } from "uuid";
import { FaPaperPlane, FaArrowLeft, FaTimes, FaEllipsisH } from "react-icons/fa";
import profileImage from "./domits-logo.jpg";
import { toast } from "react-toastify";
import MessageToast from "./MessageToast";

const toIso = (v) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
};

const ensureId = (msg) => {
  if (msg?.id) return msg;
  const sender = msg?.userId || msg?.senderId || "unknown";
  const recipient = msg?.recipientId || "unknown";
  const createdAt = msg?.createdAt || new Date().toISOString();
  const text = msg?.text || msg?.content || "";
  return { ...msg, id: `${sender}:${recipient}:${toIso(createdAt)}:${String(text).slice(0, 40)}` };
};

const normalizeForChat = (msg, userId) => {
  const m = ensureId(msg);
  const senderId = m?.userId || m?.senderId || null;
  const createdAt = toIso(m?.createdAt);

  return {
    ...m,
    userId: senderId || m?.userId,
    senderId: m?.senderId || senderId,
    recipientId: m?.recipientId,
    text: m?.text ?? m?.content ?? "",
    content: m?.content ?? m?.text ?? "",
    isSent: senderId ? senderId === userId : !!m?.isSent,
    createdAt,
    fileUrls: Array.isArray(m?.fileUrls) ? m.fileUrls : [],
  };
};

const formatChipDate = (isoLike) => {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const ChatScreen = ({
  userId,
  contactId,
  contactName,
  contactImage,
  threadId,
  handleContactListMessage,
  onBack,
  dashboardType,
}) => {
  const { messages, loading, error, fetchMessages, addNewMessage } = useFetchMessages(userId);
  const socket = useContext(WebSocketContext);
  const isHost = dashboardType === "host";

  const { bookingDetails } = isHost
    ? useFetchBookingDetails(userId, contactId)
    : useFetchBookingDetails(contactId, userId);

  const resolvedContactId = useMemo(() => {
    if (contactId && contactId !== userId) return contactId;

    const candidate =
      bookingDetails?.guestId ||
      bookingDetails?.guest_id ||
      bookingDetails?.tenantId ||
      bookingDetails?.tenant_id ||
      bookingDetails?.renterId ||
      bookingDetails?.renter_id ||
      bookingDetails?.userId ||
      bookingDetails?.user_id ||
      null;

    if (candidate && candidate !== userId) return candidate;
    return contactId;
  }, [contactId, userId, bookingDetails]);

  const { sendMessage, sending, error: sendError } = useSendMessage(userId);

  const [newMessage, setNewMessage] = useState("");
  const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
  const [showPreviewPopover, setShowPreviewPopover] = useState(false);

  const wsMessages = socket?.messages || [];
  const addedMessageIds = useRef(new Set());
  const chatContainerRef = useRef(null);
  const [forceStopLoading, setForceStopLoading] = useState(false);

  const isDemoConversation = useMemo(() => {
    const isDemoId = (id) => typeof id === "string" && (id.startsWith("test-") || id.startsWith("demo-"));
    return isDemoId(userId) || isDemoId(resolvedContactId);
  }, [userId, resolvedContactId]);

  const handleUploadComplete = (url) => {
    setUploadedFileUrls((prev) => (!prev.includes(url) ? [...prev, url] : prev));
  };

  useEffect(() => {
    if (resolvedContactId) fetchMessages(resolvedContactId, threadId);
  }, [userId, resolvedContactId, threadId, fetchMessages]);

  useEffect(() => {
    if (!loading) {
      setForceStopLoading(false);
      return;
    }
    const t = setTimeout(() => setForceStopLoading(true), 12000);
    return () => clearTimeout(t);
  }, [loading, resolvedContactId]);

  useEffect(() => {
    try {
      const el = chatContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }, [messages, resolvedContactId]);

  const handleSendAutomatedTestMessages = () => {
    if (!resolvedContactId) return;
    const baseTime = Date.now();

    const automated = [
      {
        id: `auto-${uuidv4()}`,
        userId: resolvedContactId,
        recipientId: userId,
        text: `👋 Welcome! Thanks for booking. I'm here to help with anything you need.`,
        createdAt: new Date(baseTime).toISOString(),
        isSent: false,
        isAutomated: true,
        messageType: "host_property_welcome",
      },
      {
        id: `auto-${uuidv4()}`,
        userId: resolvedContactId,
        recipientId: userId,
        text: `📍 Check-in is flexible. Share your ETA and I’ll prepare accordingly.`,
        createdAt: new Date(baseTime + 500).toISOString(),
        isSent: false,
        isAutomated: true,
        messageType: "checkin_instructions",
      },
      {
        id: `auto-${uuidv4()}`,
        userId: resolvedContactId,
        recipientId: userId,
        text: `📶 Wi-Fi details will be in the guidebook on arrival.`,
        createdAt: new Date(baseTime + 1000).toISOString(),
        isSent: false,
        isAutomated: true,
        messageType: "wifi_info",
      },
    ];

    automated.forEach((m, i) => {
      addNewMessage(m);
      if (m?.id) addedMessageIds.current.add(m.id);

      setTimeout(() => {
        if (m?.text) {
          toast.info(<MessageToast contactName={contactName} contactImage={contactImage} message={m.text} />, {
            className: "message-toast-custom",
          });
        }
      }, i * 200);
    });
  };

  useEffect(() => {
    wsMessages.forEach((raw) => {
      const msg = normalizeForChat(raw, userId);

      const sender = msg?.userId || msg?.senderId || null;
      const recipient = msg?.recipientId || null;

      const isRelevant =
        (sender === userId && recipient === resolvedContactId) ||
        (sender === resolvedContactId && recipient === userId);

      if (!isRelevant) return;

      const id = msg?.id;
      if (id && addedMessageIds.current.has(id)) return;

      addNewMessage(msg);
      if (id) addedMessageIds.current.add(id);

      if (sender === resolvedContactId && recipient === userId && msg.text) {
        toast.info(<MessageToast contactName={contactName} contactImage={contactImage} message={msg.text} />, {
          className: "message-toast-custom",
        });
      }
    });
  }, [wsMessages, userId, resolvedContactId, addNewMessage, contactName, contactImage]);

  const handleSendMessage = async () => {
    const hasContent = newMessage.trim() || uploadedFileUrls.length > 0;
    if (!hasContent) return;

    if (!resolvedContactId || resolvedContactId === userId) {
      alert("Recipient is invalid (contactId matches your userId).");
      return;
    }

    try {
      const response = await sendMessage(resolvedContactId, newMessage, uploadedFileUrls, {
        threadId: threadId || null,
        propertyId: bookingDetails?.property_id || bookingDetails?.propertyId || null,
      });

      if (!response || !response.success) {
        alert(`Error while sending: ${response?.error || "Please try again later."}`);
        return;
      }

      const saved = response?.saved || response?.data || null;
      const resolvedId = saved?.id || saved?.messageId || saved?.message?.id || uuidv4();
      const resolvedCreatedAt = toIso(saved?.createdAt || saved?.message?.createdAt || Date.now());

      const sentMessage = normalizeForChat(
        {
          id: resolvedId,
          threadId: saved?.threadId || saved?.message?.threadId || threadId || null,
          senderId: saved?.senderId || saved?.message?.senderId || userId,
          recipientId: saved?.recipientId || saved?.message?.recipientId || resolvedContactId,
          userId: saved?.senderId || saved?.message?.senderId || userId,
          text: saved?.content ?? saved?.message?.content ?? newMessage,
          content: saved?.content ?? saved?.message?.content ?? newMessage,
          fileUrls: Array.isArray(saved?.fileUrls)
            ? saved.fileUrls
            : Array.isArray(saved?.message?.fileUrls)
              ? saved.message.fileUrls
              : uploadedFileUrls,
          createdAt: resolvedCreatedAt,
          isSent: true,
        },
        userId
      );

      if (sentMessage?.id) addedMessageIds.current.add(sentMessage.id);
      addNewMessage(sentMessage);
      handleContactListMessage?.(sentMessage);

      setNewMessage("");
      setUploadedFileUrls([]);

      try {
        const el = chatContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      } catch {}
    } catch (err) {
      console.error("Unexpected error while sending:", err);
      alert("Unexpected error while sending. Please try again.");
    }
  };

  if (!resolvedContactId) return null;

  const headerProperty =
    bookingDetails?.propertyTitle ||
    bookingDetails?.property_name ||
    bookingDetails?.propertyName ||
    bookingDetails?.accoTitle ||
    "";

  return (
    <div className={`${dashboardType}-chat`}>
      <div className="chat-screen-container">
        <div className="chat-header">
          {onBack && (
            <button className="back-to-contacts-button" onClick={onBack}>
              <FaArrowLeft />
            </button>
          )}

          <img src={contactImage || profileImage} alt={contactName} className="profile-img" />

          <div className="chat-header-info">
            <h3>{contactName}</h3>
            <div className="chat-subline">
              <span className="pill">{dashboardType === "host" ? "Guest" : "Host"}</span>

              {headerProperty ? <span className="pill">{headerProperty}</span> : null}

              {bookingDetails?.arrivalDate && bookingDetails?.departureDate ? (
                <span className="pill">
                  Check-in {bookingDetails.arrivalDate} – Check-out {bookingDetails.departureDate}
                </span>
              ) : null}
            </div>
          </div>

          <div className="chat-header-actions">
            <button onClick={handleSendAutomatedTestMessages} className="test-messages-button">
              Test messages
            </button>
            <button className="dots" type="button" title="More">
              <FaEllipsisH />
            </button>
          </div>
        </div>

        <div className="chat-screen" ref={chatContainerRef}>
          {loading && !forceStopLoading ? (
            <p>Loading messages...</p>
          ) : error && !isDemoConversation ? (
            <p>{String(error)}</p>
          ) : messages.length === 0 ? (
            <p>No messages yet. Say hello 👋</p>
          ) : (
            (() => {
              let lastDay = null;

              return messages.map((m) => {
                const iso = m?.createdAt || "";
                const dayKey = iso ? String(iso).slice(0, 10) : null;
                const showDay = dayKey && dayKey !== lastDay;
                if (showDay) lastDay = dayKey;

                return (
                  <div key={m.id}>
                    {showDay && (
                      <div className="chat-date-separator">
                        {formatChipDate(iso)}
                      </div>
                    )}

                    <ChatMessage
                      message={m}
                      userId={userId}
                      contactName={contactName}
                      contactImage={contactImage}
                      dashboardType={dashboardType}
                    />
                  </div>
                );
              });
            })()
          )}
        </div>

        <div className="chat-input">
          <div className="attachment-area">
            <ChatUploadAttachment onUploadComplete={handleUploadComplete} />

            {uploadedFileUrls.length > 0 && (
              <button
                className="inline-upload-preview"
                onClick={() => setShowPreviewPopover((s) => !s)}
                title={uploadedFileUrls.length > 1 ? "View all previews" : "View preview"}
              >
                <img src={uploadedFileUrls[0]} alt="First attachment preview" />
                {uploadedFileUrls.length > 1 && <span className="more-badge">+{uploadedFileUrls.length - 1}</span>}
              </button>
            )}
          </div>

          <div className="message-input-container">
            <div className="message-input-wrapper">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="message-input-textarea"
                placeholder="Type a message..."
                onKeyUp={(e) => {
                  if (e.key === "Enter") {
                    if ((newMessage?.length || 0) <= 200) handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                className="message-input-send-button"
                disabled={sending || (newMessage?.length || 0) > 200}
                title="Send"
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>

          {(newMessage?.length || 0) > 0 && (
            <div className={`char-limit-indicator ${(newMessage?.length || 0) > 200 ? "over" : ""}`} aria-live="polite">
              {newMessage?.length || 0}/200
            </div>
          )}

          {showPreviewPopover && uploadedFileUrls.length > 0 && (
            <div className="preview-popover" role="dialog" aria-label="Attachment previews">
              <div className="preview-popover-header">
                <span>Attachments</span>
                <button className="close-popover" onClick={() => setShowPreviewPopover(false)} title="Close">
                  <FaTimes />
                </button>
              </div>

              <div className="preview-grid">
                {uploadedFileUrls.map((url, index) => (
                  <div className="preview-item" key={`${url}-${index}`}>
                    <img src={url} alt={`Attachment-${index}`} />
                    <button
                      className="remove-thumb"
                      title="Remove"
                      onClick={() => setUploadedFileUrls((prev) => prev.filter((u) => u !== url))}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {sendError && <p className="error-message">{sendError.message}</p>}
      </div>
    </div>
  );
};

export default ChatScreen;
