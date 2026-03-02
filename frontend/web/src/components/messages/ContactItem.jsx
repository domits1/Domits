import React, { useMemo } from "react";
import PropTypes from "prop-types";
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

  const displayName = (() => {
    if (!contact) return "Unknown";
    const direct = contact.givenName || contact.name || contact.fullName || contact.displayName || contact.contactName;
    if (direct) return direct;
    const first = contact.firstName || contact.first_name;
    const last = contact.lastName || contact.last_name;
    if (first && last) return `${first} ${last}`;
    return first || last || "Unknown";
  })();

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
    property: PropTypes.shape({
      title: PropTypes.string,
    }),
    latestMessage: PropTypes.shape({
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
      text: PropTypes.string,
    }),
  }).isRequired,
};

export default ContactItem;
