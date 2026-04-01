import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";

function MessageAvatar({ name, avatar }) {
  if (avatar) {
    return <img src={avatar} alt={name} className={styles.avatar} />;
  }

  const initial = String(name || "G").trim().charAt(0).toUpperCase() || "G";
  return <span className={styles.avatarFallback}>{initial}</span>;
}

MessageAvatar.propTypes = {
  name: PropTypes.string,
  avatar: PropTypes.string,
};

function MessageItem({ msg }) {
  return (
    <div className={styles.messageItem}>
      <div className={styles.messageMain}>
        <MessageAvatar name={msg.name} avatar={msg.avatar} />
        <div>
          <strong>{msg.name}</strong>
          <p>{msg.text}</p>
        </div>
      </div>
      <span className={styles.messageTime}>{msg.time}</span>
    </div>
  );
}

MessageItem.propTypes = {
  msg: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    avatar: PropTypes.string,
    text: PropTypes.string,
    time: PropTypes.string,
  }).isRequired,
};

function MessagesPanel({ messages = [], isLoading = false, onSeeAll }) {
  let content = <p>No messages</p>;

  if (isLoading) {
    content = (
      <div className={styles.cardLoaderWrap}>
        <PulseBarsLoader message="Loading messages..." />
      </div>
    );
  } else if (messages.length > 0) {
    content = messages.map((msg) => <MessageItem key={msg.id} msg={msg} />);
  }

  return (
    <div className={styles.card}>
      <h2>Recent messages</h2>

      {content}

      <button
        className={styles.seeAllBtn}
        onClick={onSeeAll}
        aria-label="View all messages"
      >
        See all messages
      </button>
    </div>
  );
}

MessagesPanel.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      avatar: PropTypes.string,
      text: PropTypes.string,
      time: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  onSeeAll: PropTypes.func,
};

export default MessagesPanel;