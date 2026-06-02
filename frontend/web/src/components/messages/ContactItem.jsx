import React, { useMemo } from "react";
import PropTypes from "prop-types";
import profileImage from "./domits-logo.jpg";

const formatTime = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const getDisplayName = (contact) => {
  if (!contact) return "Unknown";
  const direct = contact.givenName || contact.name || contact.fullName || contact.displayName || contact.contactName;
  if (direct) return direct;
  const first = contact.firstName || contact.first_name;
  const last = contact.lastName || contact.last_name;
  if (first && last) return `${first} ${last}`;
  return first || last || "Unknown";
};

const getChannelLabel = (contact) => {
  const raw = String(contact?.channelLabel || contact?.platform || contact?.latestMessage?.platform || "").toUpperCase();
  if (!raw || raw === "DOMITS") return null;
  if (raw === "WHATSAPP") return "WhatsApp";
  return raw;
};

const ContactItem = ({ contact, selected }) => {
  const time = useMemo(() => formatTime(contact?.latestMessage?.createdAt), [contact?.latestMessage?.createdAt]);

  const subtitle = contact?.latestMessage?.text ? contact.latestMessage.text : "No message history yet";
  const displayName = getDisplayName(contact);
  const channelLabel = getChannelLabel(contact);

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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <p className="contact-item-full-name">{displayName}</p>
            {channelLabel ? (
              <span
                className="contact-item-channel-badge"
                style={{
                  fontSize: "11px",
                  lineHeight: 1,
                  padding: "4px 6px",
                  borderRadius: "999px",
                  background: "#e8f7ec",
                  color: "#15803d",
                  border: "1px solid #b7e3c2",
                  whiteSpace: "nowrap",
                }}
              >
                {channelLabel}
              </span>
            ) : null}
          </div>
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

ContactItem.propTypes = {
  selected: PropTypes.bool,
  contact: PropTypes.shape({
    givenName: PropTypes.string,
    name: PropTypes.string,
    fullName: PropTypes.string,
    displayName: PropTypes.string,
    contactName: PropTypes.string,
    firstName: PropTypes.string,
    first_name: PropTypes.string,
    lastName: PropTypes.string,
    last_name: PropTypes.string,
    profileImage: PropTypes.string,
    unreadCount: PropTypes.number,
    propertyTitle: PropTypes.string,
    propertyName: PropTypes.string,
    accoName: PropTypes.string,
    bookingProperty: PropTypes.string,
    channelLabel: PropTypes.string,
    platform: PropTypes.string,
    property: PropTypes.shape({
      title: PropTypes.string,
    }),
    latestMessage: PropTypes.shape({
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
      text: PropTypes.string,
      platform: PropTypes.string,
    }),
  }).isRequired,
};

export default ContactItem;