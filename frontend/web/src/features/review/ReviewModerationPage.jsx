import React, { useCallback, useEffect, useRef, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import {
  getDomitsPrivateFeedback,
  getDomitsPrivateFeedbackInbox,
  getModerationQueue,
  moderateReview,
} from "./reviewModerationAPI";
import "./ReviewModerationPage.scss";

const formatDate = (value) => {
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const readSignals = (verification) => {
  try {
    return JSON.parse(verification?.evidenceJson || "{}").signals || [];
  } catch {
    return [];
  }
};

const formatReviewStatus = (value) => String(value || "").replaceAll("_", " ").toLowerCase();

const getVerificationLabel = (status) => {
  if (status === "NEEDS_REVIEW") return "Needs inspection";
  if (status === "VERIFIED_STAY") return "Booking verified";
  return "Verification pending";
};

const getInboxButtonLabel = ({ loading, isOpen }) => {
  if (loading) return "Loading...";
  return isOpen ? "Refresh inbox" : "Open inbox";
};

const getDecisionButtonLabel = ({ busy, decision }) => {
  if (busy) return "Saving...";
  return decision === "APPROVE" ? "Approve review" : "Reject review";
};

// Review: Internal moderation page for approving, rejecting, and inspecting submitted reviews.
export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState("APPROVE");
  const [privateFeedback, setPrivateFeedback] = useState(null);
  const [privateFeedbackLoading, setPrivateFeedbackLoading] = useState(false);
  const [privateFeedbackError, setPrivateFeedbackError] = useState("");
  const privateFeedbackRequestRef = useRef(0);
  const [feedbackInbox, setFeedbackInbox] = useState(null);
  const [feedbackInboxLoading, setFeedbackInboxLoading] = useState(false);
  const [feedbackInboxError, setFeedbackInboxError] = useState("");

  const load = useCallback(async () => {
    // Review: Loads the current moderation queue and keeps a valid selected review active.
    setLoading(true);
    setError("");
    try {
      const data = await getModerationQueue();
      const nextReviews = Array.isArray(data.reviews) ? data.reviews : [];
      setReviews(nextReviews);
      setSelectedId((current) => nextReviews.some((item) => item.id === current) ? current : nextReviews[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message || "Could not load the moderation queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = reviews.find((item) => item.id === selectedId);
  const signals = readSignals(selected?.verification);
  const reasonRequired = decision === "REJECT" || selected?.verification?.status === "NEEDS_REVIEW";
  const inboxIsOpen = feedbackInbox !== null;
  const showEmptyInbox = inboxIsOpen && feedbackInbox.length === 0;
  const showInboxList = inboxIsOpen && feedbackInbox.length > 0;
  const showInitialLoading = loading && reviews.length === 0;
  const showEmptyQueue = !loading && reviews.length === 0;
  const showModerationLayout = reviews.length > 0;
  const showEmptyPrivateFeedback = privateFeedback !== null && privateFeedback.length === 0;
  const showPrivateFeedbackList = privateFeedback !== null && privateFeedback.length > 0;

  const selectReview = (id) => {
    // Review: Switches moderation focus and clears per-review decision and feedback state.
    setSelectedId(id);
    setReason("");
    setNotes("");
    setDecision("APPROVE");
    setError("");
    privateFeedbackRequestRef.current += 1;
    setPrivateFeedback(null);
    setPrivateFeedbackError("");
    setPrivateFeedbackLoading(false);
  };

  const loadPrivateFeedback = async () => {
    // Review: Loads Domits-only feedback for the selected review without exposing it to hosts.
    if (!selected) return;
    const requestId = privateFeedbackRequestRef.current + 1;
    privateFeedbackRequestRef.current = requestId;
    setPrivateFeedbackLoading(true);
    setPrivateFeedbackError("");
    try {
      const data = await getDomitsPrivateFeedback(selected.id);
      if (privateFeedbackRequestRef.current === requestId) {
        setPrivateFeedback(Array.isArray(data.feedback) ? data.feedback : []);
      }
    } catch (loadError) {
      if (privateFeedbackRequestRef.current === requestId) {
        setPrivateFeedbackError(loadError.message || "Could not load private feedback.");
      }
    } finally {
      if (privateFeedbackRequestRef.current === requestId) {
        setPrivateFeedbackLoading(false);
      }
    }
  };

  const loadFeedbackInbox = async () => {
    // Review: Loads all Domits private feedback items for internal triage.
    setFeedbackInboxLoading(true);
    setFeedbackInboxError("");
    try {
      const data = await getDomitsPrivateFeedbackInbox();
      setFeedbackInbox(Array.isArray(data.feedback) ? data.feedback : []);
    } catch (loadError) {
      setFeedbackInboxError(loadError.message || "Could not load the private feedback inbox.");
    } finally {
      setFeedbackInboxLoading(false);
    }
  };

  const submit = async (event) => {
    // Review: Submits an approve or reject decision for the selected review.
    event.preventDefault();
    if (!selected || (reasonRequired && !reason.trim())) return;
    setBusy(true);
    setError("");
    try {
      await moderateReview(selected.id, decision, reason.trim(), notes.trim());
      setReason("");
      setNotes("");
      setDecision("APPROVE");
      await load();
    } catch (submitError) {
      setError(submitError.message || "Could not save the moderation decision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="reviewModerationPage">
      <header className="reviewModerationHeader">
        <div>
          <h1>Review moderation</h1>
          <p>{reviews.length} awaiting decision</p>
        </div>
        <button type="button" onClick={load} disabled={loading || busy} title="Refresh queue" aria-label="Refresh queue">
          <RefreshRoundedIcon />
        </button>
      </header>
      {error && <p className="reviewModerationError" role="alert">{error}</p>}
      <section className="reviewModerationInbox" aria-label="Domits private feedback inbox">
        <div className="reviewModerationInboxHeader">
          <div>
            <h2><LockRoundedIcon aria-hidden="true" /> Private feedback inbox</h2>
            {inboxIsOpen && <p>{feedbackInbox.length} feedback item{feedbackInbox.length === 1 ? "" : "s"}</p>}
          </div>
          <button type="button" onClick={loadFeedbackInbox} disabled={feedbackInboxLoading}>
            {getInboxButtonLabel({ loading: feedbackInboxLoading, isOpen: inboxIsOpen })}
          </button>
        </div>
        {feedbackInboxError && <p className="reviewModerationError" role="alert">{feedbackInboxError}</p>}
        {showEmptyInbox && <p>No private feedback has been submitted.</p>}
        {showInboxList && (
          <div className="reviewModerationInboxList">
            {feedbackInbox.map((feedback) => (
              <article key={feedback.id}>
                <div>
                  <strong>Property {feedback.propertyId}</strong>
                  <span>Reservation {feedback.reservationId} | {formatDate(feedback.createdAt)}</span>
                </div>
                <p>{feedback.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      {showInitialLoading && <p className="reviewModerationState">Loading reviews...</p>}
      {showEmptyQueue && <p className="reviewModerationState">No reviews awaiting moderation.</p>}
      {showModerationLayout && (
          <div className="reviewModerationLayout">
            <nav className="reviewModerationQueue" aria-label="Reviews awaiting moderation">
              {reviews.map((item) => (
                <button key={item.id} type="button" className={item.id === selectedId ? "selected" : ""}
                  onClick={() => selectReview(item.id)} aria-current={item.id === selectedId ? "true" : undefined}>
                  <strong>{item.title}</strong>
                  <span>{item.overallRating}/5 | {formatDate(item.createdAt)}</span>
                  <span>{formatReviewStatus(item.status)}</span>
                </button>
              ))}
            </nav>
            {selected && <section className="reviewModerationDetail" aria-label="Selected review">
              <div className="reviewModerationDetailHeader">
                <div>
                  <h2>{selected.title}</h2>
                  <p>{selected.overallRating}/5 | Booking {selected.bookingId} | {formatDate(selected.createdAt)}</p>
                </div>
                <span className={selected.verification?.status === "NEEDS_REVIEW" ? "flagged" : "verified"}>
                  {getVerificationLabel(selected.verification?.status)}
                </span>
              </div>
              <p className="reviewModerationText">{selected.publicReview}</p>
              {Object.keys(selected.categoryRatings || {}).length > 0 && <dl className="reviewModerationRatings">
                {Object.entries(selected.categoryRatings).map(([category, rating]) =>
                  <div key={category}><dt>{category}</dt><dd>{rating}/5</dd></div>)}
              </dl>}
              <section className="reviewModerationEvidence">
                <h3>Verification</h3>
                <p>Stay: {selected.verification?.status || "Pending"}</p>
                {signals.length > 0 && <ul>{signals.map((signal) => <li key={signal}>{formatReviewStatus(signal)}</li>)}</ul>}
              </section>
              <section className="reviewModerationPrivateFeedback">
                <div>
                  <h3><LockRoundedIcon aria-hidden="true" /> Private feedback to Domits</h3>
                  {privateFeedback === null && (
                    <button type="button" onClick={loadPrivateFeedback} disabled={privateFeedbackLoading}>
                      {privateFeedbackLoading ? "Loading..." : "View private feedback"}
                    </button>
                  )}
                </div>
                {privateFeedbackError && <p className="reviewModerationError" role="alert">{privateFeedbackError}</p>}
                {showEmptyPrivateFeedback && <p>No private feedback was submitted.</p>}
                {showPrivateFeedbackList && (
                  <div className="reviewModerationPrivateFeedbackList">
                    {privateFeedback.map((feedback) => (
                      <article key={feedback.id}>
                        <p>{feedback.message}</p>
                        <span>{formatDate(feedback.createdAt)}</span>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              {selected.moderationHistory?.length > 0 && <section className="reviewModerationHistory">
                <h3>History</h3>
                <ol>{selected.moderationHistory.map((entry) =>
                  <li key={entry.id}>{entry.status} | {formatDate(entry.createdAt)}{entry.reason ? ` | ${entry.reason}` : ""}</li>)}</ol>
              </section>}
              <form className="reviewModerationDecision" onSubmit={submit}>
                <fieldset disabled={busy}>
                  <legend>Decision</legend>
                  <label><input type="radio" name="decision" value="APPROVE" checked={decision === "APPROVE"}
                    onChange={() => setDecision("APPROVE")} /> Approve</label>
                  <label><input type="radio" name="decision" value="REJECT" checked={decision === "REJECT"}
                    onChange={() => setDecision("REJECT")} /> Reject</label>
                </fieldset>
                <label htmlFor="reviewModerationReason">Reason{reasonRequired ? " *" : ""}</label>
                <input id="reviewModerationReason" value={reason} onChange={(event) => setReason(event.target.value)}
                  maxLength={255} required={reasonRequired} disabled={busy} />
                <label htmlFor="reviewModerationNotes">Notes</label>
                <textarea id="reviewModerationNotes" value={notes} onChange={(event) => setNotes(event.target.value)}
                  maxLength={2000} rows={3} disabled={busy} />
                <button type="submit" disabled={busy || (reasonRequired && !reason.trim())}>
                  {decision === "APPROVE" ? <CheckRoundedIcon /> : <CloseRoundedIcon />}
                  {getDecisionButtonLabel({ busy, decision })}
                </button>
              </form>
            </section>}
          </div>
      )}
    </main>
  );
}
