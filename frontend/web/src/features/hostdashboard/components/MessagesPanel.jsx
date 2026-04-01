import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";

function MessageItem({ msg }) {
  return (
    <div className={styles.messageItem}>
      <div>
        <strong>{msg.name}</strong>
        <p>{msg.text}</p>
      </div>
      <span className={styles.messageTime}>{msg.time}</span>
    </div>
  );
}

MessageItem.propTypes = {
  msg: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    text: PropTypes.string,
    time: PropTypes.string,
  }).isRequired,
};

function MessagesPanel({ messages = [], isLoading = false, onSeeAll }) {
  return (
    <div className={styles.card}>
      <h2>Recent messages</h2>

      {isLoading ? (
        <div className={styles.cardLoaderWrap}>
          <PulseBarsLoader message="Loading messages..." />
        </div>
      ) : messages.length > 0 ? (
        messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
      ) : (
        <p>No messages</p>
      )}

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
      text: PropTypes.string,
      time: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  onSeeAll: PropTypes.func,
};

export default MessagesPanel;