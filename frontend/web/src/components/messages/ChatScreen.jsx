// frontend/web/src/components/messages/ChatScreen.jsx

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import ChatMessage from "./ChatMessage";
import BookingTab from "./BookingTab";
import MessageToast from "./MessageToast";
import { useSendMessage } from "../../features/hostdashboard/hostmessages/hooks/useSendMessage";
import { useFetchMessages } from "../../features/hostdashboard/hostmessages/hooks/useFetchMessages";
import ChatUploadAttachment from "../../features/hostdashboard/hostmessages/components/chatUploadAttachment";
import { FaPaperPlane, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../features/hostdashboard/hostmessages/hooks/useAuth";

import fallbackAvatar from "./domits-logo.jpg";

const getOtherPartyName = (selfUserId, contactId, contactName) => {
  if (!contactName) return "Unknown";
  if (!selfUserId || !contactId) return contactName;
  return contactName;
};

const NEAR_BOTTOM_PX = 40;

const getMessageKey = (message) => {
  if (!message) return "message-unknown";
  if (message.id) return String(message.id);
  if (message.clientId) return String(message.clientId);
  const sender = message.userId || message.senderId || "unknown";
  const recipient = message.recipientId || "unknown";
  const time = message.createdAt || message.time || "";
  const text = String(message.text || message.content || "").slice(0, 40);
  return `${sender}-${recipient}-${time}-${text}`;
};

const ChatScreen = ({
  userId,
  contactId,
  contactName,
  contactImage,
  threadId,
  propertyId,
  onBack,
  onClose,
  dashboardType,
  handleContactListMessage,
  testMessages = [],
}) => {
  const { accessToken } = useAuth();

  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState("");
  const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
  const [showPreviewPopover, setShowPreviewPopover] = useState(false);

  const [localMessages, setLocalMessages] = useState([]);

  const { sendMessage, sending } = useSendMessage(userId, accessToken);
  const { fetchMessages, messagesByRecipient, messagesByThread } = useFetchMessages(userId);

  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastFetchKeyRef = useRef("");
  const isNearBottomRef = useRef(true);

  const resolvedContactId = contactId || null;

  useEffect(() => {
    if (!resolvedContactId) {
      setLocalMessages([]);
      lastFetchKeyRef.current = "";
      return;
    }

    const key = `${resolvedContactId}::${threadId || ""}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;

    fetchMessages(resolvedContactId, threadId || null);
  }, [resolvedContactId, threadId, fetchMessages]);

  const mergedMessages = useMemo(() => {
    const base = threadId ? messagesByThread?.[threadId] : messagesByRecipient?.[resolvedContactId];
    const baseArr = Array.isArray(base) ? base : [];

    const extras = Array.isArray(testMessages) ? testMessages : [];
    const merged = [...baseArr, ...localMessages, ...extras];

    const uniq = [];
    const seen = new Set();
    for (const m of merged) {
      const id =
        m.id ||
        `${m.userId || m.senderId}-${m.recipientId}-${m.createdAt || m.time}-${m.text || m.content || ""}`.slice(
          0,
          140
        );
      if (seen.has(id)) continue;
      seen.add(id);
      uniq.push(m);
    }

    return uniq.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [messagesByRecipient, messagesByThread, resolvedContactId, threadId, localMessages, testMessages]);

  const computeNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance < NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((behavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const handleScroll = useCallback(() => {
    isNearBottomRef.current = computeNearBottom();
  }, [computeNearBottom]);

  useEffect(() => {
    if (!resolvedContactId) return;
    if (isNearBottomRef.current) requestAnimationFrame(() => scrollToBottom("auto"));
  }, [mergedMessages, resolvedContactId, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!resolvedContactId) return;
    if (!newMessage.trim() && uploadedFileUrls.length === 0) return;

    const effectivePropertyId = propertyId ?? null;

    const isGuest = dashboardType === "guest";
    const hostId = isGuest ? resolvedContactId : userId;
    const guestId = isGuest ? userId : resolvedContactId;

    const nowIso = new Date().toISOString();

    const makeClientId = () => {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      }
      return String(Date.now());
    };

    const optimisticId = `tmp-${nowIso}-${makeClientId()}`;

    const optimistic = {
      id: optimisticId,
      userId,
      senderId: userId,
      recipientId: resolvedContactId,
      text: newMessage.trim(),
      content: newMessage.trim(),
      createdAt: nowIso,
      fileUrls: uploadedFileUrls,
      threadId: threadId || null,
      propertyId: effectivePropertyId,
      isSent: true,
    };

    isNearBottomRef.current = true;
    setLocalMessages((prev) => [...prev, optimistic]);

    try {
      const result = await sendMessage(resolvedContactId, newMessage.trim(), uploadedFileUrls, {
        threadId: threadId || null,
        propertyId: effectivePropertyId,
        hostId,
        guestId,
        metadata: { isAutomated: false },
      });

      if (!result?.success) throw new Error(result?.error || "send failed");

      const saved = result?.saved || {};
      const finalMsg = {
        ...optimistic,
        id: saved?.id || optimisticId,
        createdAt: saved?.createdAt ? new Date(saved.createdAt).toISOString() : nowIso,
        threadId: saved?.threadId || optimistic.threadId,
      };

      setLocalMessages((prev) => prev.map((m) => (m.id === optimisticId ? finalMsg : m)));
      handleContactListMessage?.(finalMsg);

      setNewMessage("");
      setUploadedFileUrls([]);
      setShowPreviewPopover(false);
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError("Failed to send message.");
      setToastText("Message failed to send");
      setShowToast(true);
    }
  };

  const handleUploadComplete = (url) => setUploadedFileUrls((prev) => [...prev, url]);

  if (!resolvedContactId) {
    return (
      <div className="chat-screen">
        <div className="chat-empty-state">
          <h3>Select a conversation</h3>
          <p>Choose a contact to start chatting.</p>
        </div>
      </div>
    );
  }

  const headerName = getOtherPartyName(userId, resolvedContactId, contactName);
  const hasMessages = mergedMessages.length > 0;

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <div className="chat-header-left">
          {onBack && (
            <button className="chat-back" onClick={onBack} aria-label="Back" type="button">
              <FaArrowLeft />
            </button>
          )}

          <img
            src={contactImage || fallbackAvatar}
            alt="Profile"
            className="chat-header-avatar"
            onError={(e) => {
              e.currentTarget.src = fallbackAvatar;
            }}
          />

          <div className="chat-header-text">
            <h3>{headerName}</h3>
            <p className="chat-status">Active now</p>
          </div>
        </div>

        {onClose && (
          <button className="chat-close" onClick={onClose} aria-label="Close" type="button">
            ✕
          </button>
        )}
      </div>

      <div className="chat-body" ref={scrollContainerRef} onScroll={handleScroll}>
        {!hasMessages ? (
          <div className="chat-thread-empty">
            <h4>No messages yet</h4>
            <p>Say hi to start the conversation.</p>
          </div>
        ) : (
          mergedMessages.map((message) => (
            <ChatMessage
              key={getMessageKey(message)}
              message={message}
              userId={userId}
              contactName={headerName}
              contactImage={contactImage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        <BookingTab userId={userId} contactId={resolvedContactId} contactName={headerName} dashboardType={dashboardType} />

        <div className="chat-input">
          <div className="attachment-area">
            <ChatUploadAttachment onUploadComplete={handleUploadComplete} />

            {uploadedFileUrls.length > 0 && (
              <button
                className="inline-upload-preview"
                onClick={() => setShowPreviewPopover((s) => !s)}
                title={uploadedFileUrls.length > 1 ? "View all previews" : "View preview"}
                type="button"
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
                placeholder="Type a message"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if ((newMessage?.length || 0) <= 200) handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                className="message-input-send-button"
                disabled={sending}
                title="Send"
                type="button"
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>

          {showPreviewPopover && uploadedFileUrls.length > 0 && (
            <div className="preview-popover" role="dialog" aria-label="Attachment previews">
              <div className="preview-popover-header">
                <h4>Attachments</h4>
                <button onClick={() => setShowPreviewPopover(false)} aria-label="Close" type="button">
                  ✕
                </button>
              </div>
              <div className="preview-popover-body">
                {uploadedFileUrls.map((url, idx) => (
                  <div key={url} className="preview-item">
                    <img src={url} alt={`Attachment ${idx + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && showToast && <MessageToast message={toastText} type="error" onClose={() => setShowToast(false)} />}
    </div>
  );
};

ChatScreen.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  contactId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  contactName: PropTypes.string,
  contactImage: PropTypes.string,
  threadId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onBack: PropTypes.func,
  onClose: PropTypes.func,
  dashboardType: PropTypes.string,
  handleContactListMessage: PropTypes.func,
  testMessages: PropTypes.arrayOf(PropTypes.object),
};

export default ChatScreen;
