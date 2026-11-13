import React, { useEffect, useRef, useState } from "react";
import { flagReview } from "../services/reviewAPI";
import { FLAG_REASONS } from "../utils/reviewApprovalFormat";
import styles from "../styles/ReviewApproval.module.css";

export default function ReviewFlagDialog({ review, onClose, onFlagged }) {
  const dialog = useRef(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reason = data.get("reason");
    if (!reason || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await flagReview(review.id, reason, data.get("notes").trim());
      onFlagged(review);
    } catch (failure) {
      setError(failure.message || "Could not flag this review.");
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className={styles.flagDialog} aria-labelledby="flag-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
      <h2 id="flag-dialog-title">Flag for review</h2>
      <p>Send “{review.title}” to the manual moderation queue.</p>
      <form onSubmit={submit}>
        <label>Reason
          <select name="reason" required defaultValue="">
            <option value="" disabled>Select a reason</option>
            {Object.entries(FLAG_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Notes (optional)<textarea name="notes" rows={3} maxLength={2000} /></label>
        {error && <p role="alert">{error}</p>}
        <div className={styles.detailsActions}>
          <button type="button" className={styles.secondaryButton} disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.approveButton} disabled={busy}>{busy ? "Flagging…" : "Flag review"}</button>
        </div>
      </form>
    </dialog>
  );
}
