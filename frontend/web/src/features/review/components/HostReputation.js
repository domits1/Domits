import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Info, MessageSquare, ShieldCheck, UserRound, Zap } from "lucide-react";
import { getHostReviewDashboard } from "../services/reviewAPI";
import { ReviewCard } from "./ReceivedReviews";
import RatingStars from "./RatingStars";
import styles from "../styles/HostReputation.module.css";

const TOPICS = [["communication", "Communication", MessageSquare], ["responsiveness", "Responsiveness", Zap], ["hospitality", "Hospitality", Heart]];
const display = value => value === null ? "No ratings yet" : value.toFixed(1);

export default function HostReputation({ userId }) {
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const heading = useRef(null);
  const pageChange = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setResult(null);
    getHostReviewDashboard(userId, offset).then(data => { if (active) setResult(data); })
      .catch(failure => { if (active) setError(failure.message || "Could not load your host reviews."); })
      .finally(() => { if (active) {
        setLoading(false);
        if (pageChange.current) { heading.current?.focus(); pageChange.current = false; }
      } });
    return () => { active = false; };
  }, [userId, offset, retry]);
  const changePage = value => { pageChange.current = true; setOffset(value); };
  const currentPage = offset / 10 + 1;
  const totalPages = result ? Math.min(10001, Math.ceil(result.review_count / 10)) : 0;
  const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return <section className={styles.reputation} aria-label="Host reputation" aria-busy={loading}>
    <h3 ref={heading} tabIndex={-1} className={styles.srOnly}>Host reputation and feedback</h3>
    {loading && <p role="status">Loading host reviews...</p>}
    {error && <div><p role="alert">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Retry host reviews</button></div>}
    {!loading && !error && result && <>
      <div className={styles.summary}>
        <section className={`${styles.metric} ${styles.overall}`} aria-label="Host Rating">
          <h3>Host Rating <Info size={15} aria-label="Based on published host reviews" /></h3>
          <div className={styles.overallScore}><strong>{display(result.overall_score)}</strong><div>
            {result.overall_score !== null && <RatingStars value={result.overall_score} size={23} className={styles.stars} />}
            <p>({result.review_count} host {result.review_count === 1 ? "review" : "reviews"})</p>
          </div></div><span className={styles.hostIcon}><UserRound size={44} strokeWidth={1.5} aria-hidden="true" /></span>
        </section>
        {TOPICS.map(([key, label, Icon]) => <section className={styles.metric} key={key} aria-label={label}>
          <span className={styles.icon}><Icon size={28} strokeWidth={1.6} aria-hidden="true" /></span><div><h3>{label}</h3>
          <strong>{display(result.category_ratings[key])}</strong>
          {result.category_ratings[key] !== null && <RatingStars value={result.category_ratings[key]} size={20} className={styles.stars} />}</div>
        </section>)}
      </div>
      <header className={styles.listHeading}><h3>Recent Host Reviews</h3><select aria-label="Host review order" value="recent" onChange={() => {}}><option value="recent">Most recent</option></select></header>
      {!result.review_count && <p role="status">No host reviews yet. Published feedback about your service will appear here.</p>}
      {!!result.review_count && !result.reviews.length && <p role="status">No host reviews on this page.</p>}
      {!!result.reviews.length && <div className={styles.table}>
      <div className={styles.tableHeader} aria-hidden="true">{["Guest", "Stay period", "Rating", "Review", "Date", "Actions"].map(label => <span key={label}>{label}</span>)}</div>
      {result.reviews.map((review, index) => <ReviewCard key={review.id} className={styles.row} aria-label={review.title || "Host review"}>
        <div className={styles.guest}><span className={styles.avatar} data-tone={index % 3} aria-hidden="true">G</span><strong>Guest</strong>
          <span className={styles.verified}><ShieldCheck size={14} aria-hidden="true" />Verified stay</span></div>
        <span className={styles.stay} aria-label="Stay period unavailable">—</span>
        <div className={styles.reviewRating}><RatingStars value={review.overall_rating} className={styles.stars} /><strong>{review.overall_rating.toFixed(1)}</strong></div>
        <div className={styles.content}><h4>{review.title}</h4><p>{review.public_review}</p></div>
        <time dateTime={new Date(review.created_at).toISOString()}>{new Date(review.created_at).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}</time>
        <button className={styles.reply} type="button" disabled title="Replies to host reviews are not supported yet"><MessageSquare size={17} aria-hidden="true" />Reply</button>
      </ReviewCard>)}</div>}
      {!!result.review_count && <footer className={styles.pagination}>
        <p>{result.reviews.length ? `Showing ${offset + 1}–${offset + result.reviews.length} of ${result.review_count} host reviews` : `${result.review_count} host reviews`}</p>
        <nav aria-label="Host review pages">
          <button type="button" aria-label="Previous" disabled={offset === 0} onClick={() => changePage(Math.max(0, offset - 10))}><ChevronLeft size={20} /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index).map(page =>
            <button type="button" key={page} aria-label={`Page ${page}`} aria-current={currentPage === page ? "page" : undefined} onClick={() => changePage((page - 1) * 10)}>{page}</button>)}
          <button type="button" aria-label="Next" disabled={result.next_offset === null} onClick={() => changePage(result.next_offset)}><ChevronRight size={20} /></button>
        </nav>
      </footer>}
    </>}
  </section>;
}
