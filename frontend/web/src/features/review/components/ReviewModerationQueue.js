import React, { useEffect, useRef, useState } from "react";
import { getReviewFlags, resolveReviewFlag } from "../services/reviewAPI";
import { FLAG_REASONS, formatSubmittedAt } from "../utils/reviewApprovalFormat";
import styles from "../styles/ReviewApproval.module.css";

const PAGE_SIZE = 8;

export default function ReviewModerationQueue() {
  const [status, setStatus] = useState("PENDING");
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resolving, setResolving] = useState(null);
  const inFlight = useRef(false);
  const retry = () => { setResult(null); setError(""); setAttempt((value) => value + 1); };

  useEffect(() => {
    let active = true;
    getReviewFlags({ status, offset, limit: PAGE_SIZE }).then((page) => {
      if (active) setResult(page);
    }).catch((failure) => {
      if (active) setError(failure.message || "Could not load the moderation queue.");
    });
    return () => { active = false; };
  }, [status, offset, attempt]);

  async function resolve(flag) {
    if (inFlight.current) return;
    inFlight.current = true;
    setResolving(flag.id);
    setError("");
    setNotice("");
    try {
      await resolveReviewFlag(flag.id);
      setNotice(`Flag for “${flag.title}” resolved.`);
      if (result.flags.length === 1 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE));
      retry();
    } catch (failure) {
      setError(failure.message || "Could not resolve this flag.");
    } finally {
      inFlight.current = false;
      setResolving(null);
    }
  }

  return (
    <section id="moderation-panel" role="tabpanel" aria-labelledby="moderation-tab">
      <label className={`${styles.flagStatus} ${styles.filter}`}>Flag status
        <select value={status} disabled={!!resolving} onChange={(event) => {
          setStatus(event.target.value); setOffset(0); setResult(null); setError(""); setNotice("");
        }}>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </label>
      {notice && <p role="status" className={`${styles.notice} ${styles.noticeSuccess}`}>{notice}</p>}
      {error && <p role="alert" className={`${styles.notice} ${styles.noticeError}`}>{error}</p>}
      {!result && (error
        ? <button type="button" className={styles.secondaryButton} onClick={retry}>Retry</button>
        : <p role="status">Loading review flags…</p>)}
      {result?.flags.length === 0 && <p className={styles.emptyState}>No {status.toLowerCase()} review flags.</p>}
      {!!result?.flags.length && <div className={styles.tableCard}>
        <table className={`${styles.table} ${styles.moderationTable}`} aria-label="Flagged reviews">
          <thead><tr>{["Review", "Rating", "Flag reason", "Flagged", "Status", "Actions"].map((label) =>
            <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{result.flags.map((flag) => (
            <tr key={flag.id}>
              <td><details>
                <summary className={styles.strong}>{flag.title}</summary>
                <p>{flag.public_review}</p>
                {flag.notes && <p><strong>Flag notes</strong><br />{flag.notes}</p>}
              </details></td>
              <td>{Number(flag.overall_rating).toFixed(1)}</td>
              <td>{FLAG_REASONS[flag.reason] ?? flag.reason}</td>
              <td>{formatSubmittedAt(flag.created_at).date}</td>
              <td><span className={`${styles.pill} ${status === "PENDING" ? styles.pillPending : styles.pillVerified}`}>
                {status === "PENDING" ? "Pending" : "Resolved"}
              </span></td>
              <td>{status === "PENDING" && <button type="button" className={styles.secondaryButton}
                disabled={!!resolving} onClick={() => resolve(flag)}>
                {resolving === flag.id ? "Resolving…" : "Mark resolved"}
              </button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
      {result && (offset > 0 || result.next_offset !== null) && <div className={`${styles.footer} ${styles.pager}`}>
        <button type="button" className={styles.secondaryButton} disabled={!offset || !!resolving}
          onClick={() => { setOffset(Math.max(0, offset - PAGE_SIZE)); setResult(null); setError(""); }}>Previous page</button>
        <button type="button" className={styles.secondaryButton} disabled={result.next_offset === null || !!resolving}
          onClick={() => { setOffset(result.next_offset); setResult(null); setError(""); }}>Next page</button>
      </div>}
    </section>
  );
}
