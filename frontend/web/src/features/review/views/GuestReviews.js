import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  CalendarDays,
  Star,
  Lightbulb,
} from "lucide-react";
import styles from "../styles/GuestReviews.module.css";
import { Auth } from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../../../utils/DateFormatterDD_MM_YYYY";

import { requestReview } from "../services/reviewAPI";

function ReviewCard({ review, isWritten, deletingId, onDelete, navigate }) {
  const rating = Number(review.overall_rating ?? review.rating);
  const hasRating = Number.isFinite(rating) && rating >= 1 && rating <= 5;
  return (
    <article key={review.id} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.badge}>{isWritten ? "Written by you" : "From your host"}</span>
        {hasRating && (
          <span className={styles.rating} aria-label={`${rating} out of 5 stars`}>
            <Star size={15} fill="currentColor" aria-hidden="true" /> {rating}
          </span>
        )}
      </div>
      <h3>{review.title || "Stay review"}</h3>
      <p className={styles.content}>{review.content || review.public_review || "No written feedback provided."}</p>
      <footer className={styles.cardFooter}>
        <span className={styles.date}>
          <CalendarDays size={14} aria-hidden="true" />{" "}
          {review.date ? DateFormatterDD_MM_YYYY(review.date) : "Date unavailable"}
        </span>
        {isWritten && (
          <div className={styles.actions}>
            {review.can_edit && Date.now() < review.edit_expires_at && (
              <button type="button" onClick={() => navigate(`/review?reviewId=${encodeURIComponent(review.id)}`)}>
                <Pencil size={14} aria-hidden="true" /> Edit review
              </button>
            )}
            <button
              type="button"
              className={styles.delete}
              disabled={deletingId === review.id}
              onClick={() => onDelete(review)}
              aria-label="Delete review">
              <Trash2 size={14} aria-hidden="true" /> {deletingId === review.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}

function ReviewList({ loading, visibleReviews, isWritten, deletingId, asyncDeleteReview, navigate }) {
  if (loading)
    return (
      <output className={styles.loading}>
        <span className={styles.loader} aria-hidden="true" /> Loading your reviews...
      </output>
    );
  if (!visibleReviews.length)
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>
          <MessageSquare size={28} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h3>{isWritten ? "Your story starts with a stay" : "A fresh start for feedback"}</h3>
        <p>
          {isWritten
            ? "You haven't written any reviews yet. After your next stay, share the details that made it memorable."
            : "You haven't received any reviews yet. Feedback from your hosts will appear here."}
        </p>
      </div>
    );
  return (
    <div className={styles.cards}>
      {visibleReviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isWritten={isWritten}
          deletingId={deletingId}
          onDelete={asyncDeleteReview}
          navigate={navigate}
        />
      ))}
    </div>
  );
}

function GuestReviews() {
  const [activeTab, setActiveTab] = useState("written");
  const [deletingId, setDeletingId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoading2, setIsLoading2] = useState(true);
  const [userId, setUserId] = useState(null);
  const [reviewError, setReviewError] = useState("");
  const navigate = useNavigate();

  // Get user once & redirect if not logged in
  useEffect(() => {
    (async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        const sub = userInfo?.attributes?.sub;
        if (sub) setUserId(sub);
        else navigate("/login");
      } catch (err) {
        console.error("Auth/currentUserInfo error:", err);
        navigate("/login");
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    const retrieveReviews = async () => {
      setIsLoading(true);
      try {
        const res = await requestReview("GET", { scope: "written" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch (e) {
        setReviewError("Could not load your reviews. Please try again.");
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    retrieveReviews();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const retrieveReceivedReviews = async () => {
      setIsLoading2(true);
      try {
        const res = await requestReview("GET", { scope: "received" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReceivedReviews(Array.isArray(data) ? data : []);
      } catch (e) {
        setReviewError("Could not load received reviews. Please try again.");
        setReceivedReviews([]);
      } finally {
        setIsLoading2(false);
      }
    };

    retrieveReceivedReviews();
  }, [userId]);

  const asyncDeleteReview = async (review) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    const reviewId = review.id;

    setDeletingId(reviewId);
    try {
      const res = await requestReview("DELETE", { reviewId });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (e) {
      setReviewError("Could not delete your review. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const isWritten = activeTab === "written";
  const visibleReviews = isWritten ? reviews : receivedReviews;
  const loading = isWritten ? isLoading : isLoading2;

  return (
    <main className={`page-body ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>YOUR EXPERIENCES</span>
          <h1>Review history</h1>
          <p>A little reflection on the places you have been.</p>
        </div>
        <span className={styles.headerIcon}>
          <MessageSquare size={25} aria-hidden="true" />
        </span>
      </header>

      <div className={styles.summary}>
        {[
          { label: "Reviews written", value: reviews.length, busy: isLoading, Icon: ArrowUpRight },
          { label: "Reviews received", value: receivedReviews.length, busy: isLoading2, Icon: ArrowDownLeft },
        ].map(({ label, value, busy, Icon }) => (
          <div className={styles.stat} key={label}>
            <span className={styles.statIcon}>
              <Icon size={21} aria-hidden="true" />
            </span>
            <div>
              <strong>{busy ? "�" : value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {reviewError && (
        <div className={styles.error} role="alert">
          {reviewError}
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.history} aria-label="Review history">
          <div className={styles.tabs} role="group" aria-label="Review type">
            <button
              type="button"
              aria-pressed={isWritten}
              className={isWritten ? styles.active : ""}
              onClick={() => setActiveTab("written")}>
              My reviews <span>{isLoading ? "�" : reviews.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={!isWritten}
              className={!isWritten ? styles.active : ""}
              onClick={() => setActiveTab("received")}>
              Received reviews <span>{isLoading2 ? "�" : receivedReviews.length}</span>
            </button>
          </div>

          <div className={styles.sectionHeading}>
            <h2>{isWritten ? "Your shared experiences" : "What hosts shared"}</h2>
            <p>
              {isWritten
                ? "Your thoughts help others find their next great stay."
                : "Feedback from the people who welcomed you."}
            </p>
          </div>

          <div aria-busy={loading}>
            <ReviewList
              loading={loading}
              visibleReviews={visibleReviews}
              isWritten={isWritten}
              deletingId={deletingId}
              asyncDeleteReview={asyncDeleteReview}
              navigate={navigate}
            />
          </div>
        </section>

        <aside className={styles.aside}>
          <span className={styles.tipIcon}>
            <Lightbulb size={22} aria-hidden="true" />
          </span>
          <h2>
            Small details.
            <br />
            Better stays.
          </h2>
          <p>A thoughtful review makes a difference for hosts and fellow travellers.</p>
          <div className={styles.tip}>
            <strong>Keep it personal</strong>
            <p>Share what stood out, from a warm welcome to a favourite corner.</p>
          </div>
          <div className={styles.tip}>
            <strong>Keep it helpful</strong>
            <p>Honest, specific feedback helps others know what to expect.</p>
          </div>
          <span className={styles.asideFooter}>Every experience has a story.</span>
        </aside>
      </div>
    </main>
  );
}

export default GuestReviews;
