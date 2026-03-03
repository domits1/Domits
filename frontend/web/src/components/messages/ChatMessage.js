import React, { useState } from "react";
import PropTypes from "prop-types";
import profileImage from "./domits-logo.jpg";
import Icon from "@mdi/react";
import {
  mdiPartyPopper,
  mdiClipboardTextOutline,
  mdiDoor,
  mdiWifi,
  mdiStarOutline,
  mdiRobotOutline,
} from "@mdi/js";

const ChatMessage = ({ message, userId, contactName, contactImage }) => {
  const { userId: senderId, text, createdAt, isSent, fileUrls, isAutomated, messageType } = message;

  const formatTime = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const isOutgoingBySender = senderId ? senderId === userId : null;
  const isOutgoing = isOutgoingBySender !== null ? isOutgoingBySender : Boolean(isSent);
  const isIncoming = isOutgoing === false;
  const directionClass = isOutgoing ? "sent" : "received";

  const [modalImage, setModalImage] = useState(null);
  const isAutomatedMessage = isAutomated === true;

  const getAutomatedIcon = (type) => {
    switch (type) {
      case "booking_confirmation":
        return mdiPartyPopper;
      case "checkin_instructions":
        return mdiClipboardTextOutline;
      case "checkout_instructions":
        return mdiDoor;
      case "wifi_info":
        return mdiWifi;
      case "feedback_request":
        return mdiStarOutline;
      default:
        return mdiRobotOutline;
    }
  };

  const automatedIcon = isAutomatedMessage ? getAutomatedIcon(messageType) : null;
  const hasText = typeof text === "string" && text.trim().length > 0;

  const openImage = (url) => setModalImage(url);

  return (
    <div className={`chat-message-row ${directionClass} ${isAutomatedMessage ? "automated-message" : ""}`}>
      {isIncoming && (
        <img
          className="chat-message-avatar"
          src={contactImage || profileImage}
          alt={contactName || "Contact"}
          onError={(e) => {
            e.currentTarget.src = profileImage;
          }}
        />
      )}

      <div className={`chat-message ${directionClass} ${isAutomatedMessage ? "automated" : ""}`}>
        {isAutomatedMessage && (
          <div className="automated-header">
            <Icon path={automatedIcon} size={0.75} aria-label="automated-icon" />
            <span>{senderId === userId ? "You" : contactName} (Automated)</span>
          </div>
        )}

        {hasText && (
          <div className="message-content">
            <span className="message-text">{text}</span>
          </div>
        )}

        {fileUrls?.length > 0 && (
          <div className="message-attachments">
            {fileUrls.map((fileUrl) => {
              const isVideo = fileUrl.endsWith(".mp4");
              const attachmentKeyBase = message?.id || `${senderId || "unknown"}-${createdAt || ""}`;
              const attachmentKey = `${attachmentKeyBase}-${fileUrl}`;
              return isVideo ? (
                <video key={attachmentKey} controls className="message-video">
                  <source src={fileUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <button
                  key={attachmentKey}
                  type="button"
                  className="message-image-button"
                  onClick={() => openImage(fileUrl)}
                  aria-label="Open attachment"
                  style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                >
                  <img src={fileUrl} alt="Attachment" className="message-image" />
                </button>
              );
            })}
          </div>
        )}

        <div className="message-footer">
          <span>{formatTime(createdAt)}</span>
          {isOutgoing ? <span className="message-status">✓✓</span> : null}
        </div>
      </div>

      {modalImage && (
        <button
          className="image-modal"
          type="button"
          aria-label="Close image preview"
          onClick={() => setModalImage(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              e.preventDefault();
              setModalImage(null);
            }
          }}
          style={{ border: 0, padding: 0, background: "transparent" }}
        >
          <img src={modalImage} alt="Enlarged attachment" className="image-modal-content" />
        </button>
      )}
    </div>
  );
};

ChatMessage.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  contactName: PropTypes.string,
  contactImage: PropTypes.string,
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    senderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string,
    content: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    isSent: PropTypes.bool,
    fileUrls: PropTypes.arrayOf(PropTypes.string),
    isAutomated: PropTypes.bool,
    messageType: PropTypes.string,
  }).isRequired,
};

export default ChatMessage;
