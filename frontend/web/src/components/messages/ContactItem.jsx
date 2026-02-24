import React, { useMemo } from "react";
import profileImage from "./domits-logo.jpg";

const formatTime = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const ContactItem = ({ contact, selected }) => {
  const time = useMemo(() => formatTime(contact?.latestMessage?.createdAt), [contact?.latestMessage?.createdAt]);

  const subtitle = contact?.latestMessage?.text ? contact.latestMessage.text : "No message history yet";

  const displayName = contact?.givenName || "Unknown";

  const meta =
    contact?.propertyTitle ||
    contact?.propertyName ||
    contact?.accoName ||
    contact?.bookingProperty ||
    contact?.property?.title ||
    "";

  return (
    <div className={`contact-item-content ${selected ? "selected" : ""}`}>
      <div className="contact-item-image-container">
        <img src={contact.profileImage || profileImage} alt="Profile" className="contact-item-profile-image" />
        <span className="contact-online-dot" />
      </div>

      <div className="contact-item-text-container">
        <div className="contact-item-title-row">
          <p className="contact-item-full-name">{displayName}</p>
          <p className="contact-item-time">{time}</p>
        </div>

        <p className="contact-item-subtitle">
          {subtitle}
          {meta ? <span className="contact-item-meta">{meta}</span> : null}
          {(contact?.unreadCount || 0) > 0 ? <span className="contact-unread-badge">{contact.unreadCount}</span> : null}
        </p>
      </div>
    </div>
  );
};

export default ContactItem;