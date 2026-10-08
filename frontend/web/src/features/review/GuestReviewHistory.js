import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGuestReviewHistory, getGuestReviewDetail } from "./services/reviewAPI";
import styles from "./GuestReviewHistory.module.css";

const statusLabel = (value) => value?.replace(/_/g, " ") || "Unknown";
function HistoryCard({ review, onOpen, onEdit }) {
  const [timestamp, setTimestamp] = useState(Date.now);
  useEffect(() => {
    const remaining = review.edit_expires_at - timestamp;
    if (!Number.isFinite(remaining) || remaining <= 0 || review.can_edit !== true) return undefined;
    const timer = setTimeout(() => setTimestamp(Date.now()), Math.min(remaining, 2147483647));
    return () => clearTimeout(timer);
  }, [review.edit_expires_at, review.can_edit, timestamp]);
  const date = new Date(review.created_at), validDate = Number.isFinite(date.getTime());
  const canEdit = review.can_edit === true && Number.isFinite(review.edit_expires_at)
    && Date.now() < review.edit_expires_at;
  return <article className={styles.card}>
    <h3>{review.property_name || "Property unavailable"}</h3><h4>{review.title}</h4>
    <p>Overall rating: {review.overall_rating}/5</p>
    <p>Status: {statusLabel(review.status)} · Publication: {statusLabel(review.publication_status)}</p>
    {validDate && <time dateTime={date.toISOString()}>Submitted on {date.toLocaleDateString(undefined,
      { year: "numeric", month: "short", day: "numeric" })}</time>}
    <p className={styles.text}>{review.public_review}</p>
    {Object.keys(review.category_ratings || {}).length > 0 && <dl className={styles.categories}>
      {Object.entries(review.category_ratings).map(([key, rating]) => <div key={key}>
        <dt>{key.replace(/_/g, " ")}</dt><dd>{rating}/5</dd></div>)}
    </dl>}
    {review.response && <aside aria-label="Host response"><strong>Host response</strong>
      <p className={styles.text}>{review.response.message}</p></aside>}
    <div className={styles.actions}>
      {onOpen && <button type="button" onClick={() => onOpen(review.id)}>View details</button>}
      {canEdit && <button type="button" onClick={() => onEdit(review.id)}>Edit review</button>}
    </div>
  </article>;
}

export default function GuestReviewHistory() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0), [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true });
  const [selected, setSelected] = useState(null), [detailAttempt, setDetailAttempt] = useState(0);
  const [detail, setDetail] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    getGuestReviewHistory(offset, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ data }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [offset, attempt]);
  useEffect(() => {
    if (!selected) return undefined;
    const controller = new AbortController();
    setDetail({ loading: true });
    getGuestReviewDetail(selected, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setDetail({ data }); })
      .catch((error) => { if (!controller.signal.aborted) setDetail({ error: error.message }); });
    return () => controller.abort();
  }, [selected, detailAttempt]);
  const edit = (id) => navigate(`/review?reviewId=${encodeURIComponent(id)}`);
  const open = (id) => { setDetail({ loading: true }); setSelected(id); };
  const page = (value) => { setState({ loading: true }); setSelected(null); setOffset(value); };
  return <section className={styles.history} aria-label="My reviews">
    <h2>My reviews</h2>
    {state.loading && <p role="status">Loading your reviews…</p>}
    {state.error && <div role="alert"><p>{state.error}</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry history</button></div>}
    {state.data && <>
      {state.data.reviews.length === 0 ? <p>{offset === 0 ? "You haven’t submitted any reviews yet." : "No reviews on this page."}</p>
        : state.data.reviews.map((review) => <HistoryCard key={review.id} review={review} onOpen={open} onEdit={edit} />)}
      <nav className={styles.actions} aria-label="Review history pages">
        {offset > 0 && <button type="button" onClick={() => page(offset - 10)}>Previous reviews</button>}
        {state.data.next_offset != null && <button type="button" onClick={() => page(state.data.next_offset)}>Next reviews</button>}
      </nav>
    </>}
    {selected && <section aria-label="Review details"><h2>Review details</h2>
      <button type="button" onClick={() => setSelected(null)}>Close details</button>
      {detail.loading && <p role="status">Loading review details…</p>}
      {detail.error && <div role="alert"><p>{detail.error}</p>
        <button type="button" onClick={() => setDetailAttempt((value) => value + 1)}>Retry details</button></div>}
      {detail.data && <HistoryCard review={detail.data} onEdit={edit} />}
    </section>}
  </section>;
}
