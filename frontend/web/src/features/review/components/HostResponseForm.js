import React, { useState } from "react";
import { saveHostResponse } from "../services/reviewAPI";
import styles from "../styles/ReceivedReviews.module.css";

export default function HostResponseForm({ review, onSaved }) {
  const [message, setMessage] = useState(review.response?.message || "");
  const [response, setResponse] = useState(review.response);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const save = async (action) => {
    if (busy) return;
    const text = message.replace(/\r\n?/g, "\n").trim();
    // eslint-disable-next-line no-control-regex
    if (!text || text.length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(message)) {
      setError("Write a response between 1 and 500 characters using plain text.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = action === "publish"
        ? await saveHostResponse(review.id, text)
        : await saveHostResponse(review.id, text, action);
      setResponse(saved); setMessage(saved.message);
      onSaved?.(saved);
      setNotice(saved.status === "draft" ? "Draft saved. It is not publicly visible." : "Response published.");
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "";
      setError(message || "Could not save your response. Please try again.");
    }
    finally { setBusy(false); }
  };
  let submitLabel = "Publish response";
  if (busy) {
    submitLabel = "Saving...";
  } else if (response?.status === "draft") {
    submitLabel = "Publish";
  } else if (response) {
    submitLabel = "Update public response";
  }
  return <div className={styles.responseEditor}>
    <div className={styles.responseHeading}><h3>Your response</h3>
    {response && <aside aria-label={response.status === "draft" ? "Response draft" : "Host response"}>
      <strong>{response.status === "draft" ? "Draft (not publicly visible)" : "Host response"}</strong>
      <span className={styles.savedMessage}>{response.message}</span></aside>}
    </div>
    {response?.updatedAt && <p className={styles.lastEdited}>Last edited: {new Date(Number(response.updatedAt)).toLocaleString("en-GB", { timeZone: "Europe/Amsterdam" })}</p>}
    <p className={styles.editorHint}>Write a thoughtful reply to this review. You can save it as a draft and publish it later.</p>
    <form onSubmit={(event) => { event.preventDefault(); save("publish"); }} noValidate>
      <label className={styles.savedMessage} htmlFor={`response-${review.id}`}>Your response</label>
      <textarea className={styles.textarea} id={`response-${review.id}`} value={message} maxLength={500}
        required disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? `response-error-${review.id}` : undefined}
        onChange={(event) => { setMessage(event.target.value); setError(""); }} />
      <p className={styles.characterCount}>{message.length}/500 characters</p>
      {error && <p id={`response-error-${review.id}`} role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className={styles.responseActions}>
      <button type="button" disabled={busy} onClick={() => { setMessage(response?.message || ""); setError(""); setNotice(""); }}>Cancel</button>
      {(!response || response.status === "draft") &&
        <button type="button" disabled={busy} onClick={() => save(response ? "edit" : "draft")}>Save Draft</button>}
      <button className={styles.publishButton} type="submit" disabled={busy}>{submitLabel}</button>
      </div>
    </form>
  </div>;
}
