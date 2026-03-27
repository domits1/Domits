import React from "react";
import styles from "../HostDashboard.module.scss";

function MessagesPanel({ messages = [], onSeeAll }) {
  return (
    <div className={styles.card}>
      <h3>Recent messages</h3>

      {messages.length > 0 ? (
        messages.map((msg) => (
          <div key={msg.id} className={styles.messageItem}>
            <div>
              <strong>{msg.name}</strong>
              <p>{msg.text}</p>
            </div>
            <span className={styles.messageTime}>{msg.time}</span>
          </div>
        ))
      ) : (
        <p>No messages</p>
      )}

      <button
        className={styles.seeAllBtn}
        onClick={onSeeAll}  
      >
        See all
      </button>
    </div>
  );
}

export default MessagesPanel;