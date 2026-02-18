// /Users/mh/Domits/frontend/web/src/components/messages/ChatMessage.js

import React, { useState } from "react";
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

  // Determine direction: prefer actual sender vs current user, fall back to legacy isSent flag
  const isOutgoingBySender = senderId ? senderId === userId : null;
  const isOutgoing = isOutgoingBySender !== null ? isOutgoingBySender : !!isSent;
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

  return (
    <div className={`chat-message-row ${directionClass} ${isAutomatedMessage ? "automated-message" : ""}`}>
      {!isOutgoing && (
        <img className="chat-avatar" src={contactImage || profileImage} alt={contactName || "Contact"} />
      )}

      <div className={`chat-message ${directionClass} ${isAutomatedMessage ? "automated" : ""}`}>
        {isAutomatedMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 12, opacity: 0.85 }}>
            <Icon path={automatedIcon} size={0.75} aria-label="automated-icon" />
            {senderId === userId ? "You" : contactName} (Automated)
          </div>
        )}

        {hasText && (
          <div className="message-content">
            <span className="message-text">{text}</span>
          </div>
        )}

        {fileUrls?.length > 0 && (
          <div className="message-attachments">
            {fileUrls.map((fileUrl, index) => {
              const isVideo = fileUrl.endsWith(".mp4");
              return isVideo ? (
                <video key={index} controls className="message-video">
                  <source src={fileUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  key={index}
                  src={fileUrl}
                  alt="Attachment"
                  className="message-image"
                  onClick={() => setModalImage(fileUrl)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </div>
        )}

        <div className="message-footer">{formatTime(createdAt)}</div>
      </div>

      {modalImage && (
        <div className="image-modal" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Enlarged attachment" className="image-modal-content" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
