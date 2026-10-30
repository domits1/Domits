import React, { useState } from "react";
import { saveHostResponse, deleteHostResponse } from "../services/reviewAPI";
import styles from "../styles/HostResponse.module.css";

export default function HostResponseForm({ review, onResponseChange }) {
  const initialResponse = review.response?.status === "deleted" || review.response?.deletedAt != null ? null : review.response;
  const [response, setResponse] = useState(initialResponse);
  const [message, setMessage] = useState(initialResponse?.message || "");
  const [editing, setEditing] = useState(!initialResponse || initialResponse.status === "draft");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const published = Boolean(response && response.status !== "draft");
  const normalizedMessage = message.replace(/\r\n?/g, "\n").trim();
  // eslint-disable-next-line no-control-regex
  const validMessage = normalizedMessage.length > 0 && normalizedMessage.length <= 500 && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(message);
  const changed = normalizedMessage !== (response?.message || "").replace(/\r\n?/g, "\n").trim();
  const canPublish = !busy && !confirmDelete && editing && validMessage && (!published || changed);
  const canDelete = Boolean(response) && !busy;
  const submit = async (event) => {
    event.preventDefault();
    if (!canPublish) return;
    const text = normalizedMessage;
    setBusy(true); setError("");
    try {
      const saved = await saveHostResponse(review.id, text);
      setResponse(saved); setMessage(saved.message); setEditing(false); onResponseChange?.(saved);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : "Could not save your response. Please try again.");
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!canDelete || !confirmDelete) return;
    setBusy(true); setError("");
    try {
      await deleteHostResponse(review.id);
      setResponse(null); onResponseChange?.(null); setMessage(""); setEditing(true); setConfirmDelete(false);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : "Could not delete your response. Please try again.");
    } finally { setBusy(false); }
  };
  const publishedDate = response?.publishedAt ? new Date(Number(response.publishedAt)) : null;
  return <section className={styles.response} aria-label="Your response">
    <header className={styles.heading}>
      <h3>Your response</h3>
      {response && <span className={styles.badge}>{published ? "Published" : "Draft"}</span>}
      {publishedDate && Number.isFinite(publishedDate.getTime()) && <small>Published {publishedDate.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</small>}
    </header>
    <form className={styles.surface} onSubmit={submit} noValidate aria-busy={busy}>
      {editing ? <>
        <label className={styles.label} htmlFor={`response-${review.id}`}>Your response</label>
        <textarea id={`response-${review.id}`} value={message} maxLength={500} rows={8}
          placeholder="Thank your guest and respond to their feedback..."
          required disabled={busy} aria-invalid={Boolean(error)} aria-describedby={`response-help-${review.id}`}
          onChange={(event) => { setMessage(event.target.value); setError(""); }} />
        <p className={styles.count} id={`response-help-${review.id}`}>{message.length}/500 characters. Your response will be public.</p>
      </> : <aside aria-label="Host response" className={styles.message}>{response?.message}</aside>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {confirmDelete ? <div className={styles.confirm}>
        <p>Delete this response? It will no longer appear on the review.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.danger} disabled={!canDelete} onClick={remove}>{busy ? "Deleting..." : "Confirm delete"}</button>
          <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep response</button>
        </div>
      </div> : <div className={styles.actions}>
        <button type="button" className={styles.danger} disabled={!canDelete} onClick={() => setConfirmDelete(true)}>Delete Response</button>
        <button type="button" disabled={busy || !response || editing} onClick={() => { setEditing(true); setError(""); }}>Edit</button>
        {response && editing && <button type="button" disabled={busy} onClick={() => { setMessage(response.message); setEditing(false); setError(""); }}>Cancel</button>}
        <button type="submit" className={styles.publish} disabled={!canPublish}>{busy ? "Publishing..." : "Publish"}</button>
      </div>}
    </form>
  </section>;
}
