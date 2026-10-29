import React, { useState } from "react";
import { saveHostResponse } from "./services/reviewAPI";
import styles from "./styles/ReviewPage.module.css";

export default function HostResponseForm({ review }) {
  const [message, setMessage] = useState(review.response?.message || "");
  const [response, setResponse] = useState(review.response);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const text = message.replace(/\r\n?/g, "\n").trim();
    // eslint-disable-next-line no-control-regex
    if (!text || text.length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(message)) {
      setError("Write a response between 1 and 500 characters using plain text.");
      return;
    }
    setBusy(true); setError("");
    try {
      const saved = await saveHostResponse(review.id, text);
      setResponse(saved); setMessage(saved.message);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Could not save your response.");
    }
    finally { setBusy(false); }
  };
  let submitLabel = "Publish response";
  if (busy) {
    submitLabel = "Saving...";
  } else if (response) {
    submitLabel = "Update public response";
  }
  return <div>
    {response && <aside aria-label="Host response"><strong>Host response</strong>
      <p className={styles.reviewText}>{response.message}</p></aside>}
    <form onSubmit={submit} noValidate>
      <label htmlFor={`response-${review.id}`}>Your response</label>
      <textarea className={styles.textarea} id={`response-${review.id}`} value={message} maxLength={500}
        required disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? `response-error-${review.id}` : undefined}
        onChange={(event) => { setMessage(event.target.value); setError(""); }} />
      <p>{message.length}/500 characters</p>
      {error && <p id={`response-error-${review.id}`} role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{submitLabel}</button>
    </form>
  </div>;
}
