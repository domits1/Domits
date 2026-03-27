import React from "react";
import styles from "../HostDashboard.module.scss";

function MessagesPanel({ data = [] }) {
  const messages = data.slice(0, 3); // placeholder until API exists

  return (
    <div className={styles.card}>
      <h3>Recent messages</h3>

      {messages.length > 0 ? (
        messages.map((msg, i) => (
          <div key={i} className={styles.messageItem}>
            <div>
              <strong>{msg?.guestName || "Guest"}</strong>
              <p>{msg?.message || "No message content"}</p>
            </div>
            <span className={styles.messageTime}>--:--</span>
          </div>
        ))
      ) : (
        <p>No messages</p>
      )}

      <button className={styles.seeAllBtn}>See all</button>
    </div>
  );
}

export default MessagesPanel;