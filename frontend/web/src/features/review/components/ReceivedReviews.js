import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Star, MapPin, Building2, MessageSquare, ChevronRight } from "lucide-react";
import { fetchHostPropertySelectOptions } from "../../../services/hostPropertyService";
import styles from "../styles/ReceivedReviews.module.css";
import CategoryRatings from "./categoryRatings";
import RatingStars from "./RatingStars";
import HostResponseForm from "../HostResponseForm";

const rating = (review) => {
  const value = Number(review.rating ?? review.overall_rating);
  return Number.isFinite(value) && value >= 1 && value <= 5 ? value : null;
};
const timestamp = (review) => {
  const value = review.date ?? review.created_at;
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  const time = new Date(parsed).getTime();
  return Number.isFinite(time) ? time : 0;
};
const dateLabel = (review) =>
  timestamp(review)
    ? new Date(timestamp(review)).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Date unavailable";

function Stars({ value }) {
  return (
    <RatingStars value={value} className={styles.stars} />
  );
}

function PropertyImage({ property }) {
  const source = property?.previewImages?.[0];
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return (
    <span className={styles.thumbnail}>
      {source && !failed ? (
        <img src={source} alt="" onError={() => setFailed(true)} />
      ) : (
        <Building2 size={28} aria-hidden="true" />
      )}
    </span>
  );
}

export default function ReceivedReviews({ userId, reviews, loading, error, onRetry, respondableReviews = {} }) {
  const [properties, setProperties] = useState({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const listRef = useRef(null);
  useEffect(() => {
    let active = true;
    setProperties({});
    if (!userId) return undefined;
    fetchHostPropertySelectOptions(userId)
      .then((items) => {
        if (active) setProperties(Object.fromEntries(items.map((item) => [item.value, item])));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  const sorted = useMemo(() => [...reviews].sort((a, b) => timestamp(b) - timestamp(a)), [reviews]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const results = sorted.filter((review) =>
      [
        review.title,
        review.content ?? review.public_review,
        properties[review.property_id]?.title,
        properties[review.property_id]?.location,
        review.booking_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
    if (sort === "oldest") results.reverse();
    if (sort === "highest") results.sort((a, b) => (rating(b) ?? 0) - (rating(a) ?? 0));
    if (sort === "lowest") results.sort((a, b) => (rating(a) ?? 6) - (rating(b) ?? 6));
    return results;
  }, [sorted, query, sort, properties]);
  const scores = reviews.map(rating).filter((value) => value !== null);
  const average = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
  const focusReview = (id) => {
    setQuery("");
    requestAnimationFrame(() => {
      const target = Array.from(listRef.current?.querySelectorAll("article") || []).find(
        (item) => item.dataset.reviewId === String(id)
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
  };

  return (
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search received reviews"
              placeholder="Search reviews or properties..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <details className={styles.sort} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
          }} onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary").focus();
            }
          }}>
            <summary aria-label="Sort received reviews">
              {{ newest: "Newest first", oldest: "Oldest first", highest: "Highest rating", lowest: "Lowest rating" }[sort]}
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className={styles.sortOptions} role="group" aria-label="Sort order">
              {[["newest", "Newest first"], ["oldest", "Oldest first"], ["highest", "Highest rating"], ["lowest", "Lowest rating"]].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={sort === value} onClick={(event) => {
                  setSort(value);
                  const dropdown = event.currentTarget.closest("details");
                  dropdown.open = false;
                  dropdown.querySelector("summary").focus();
                }}>{label}</button>
              ))}
            </div>
          </details>
        </div>
        <section className={styles.reviewList} ref={listRef} aria-labelledby="received-heading">
          <h3 id="received-heading">Received reviews ({reviews.length})</h3>
          {loading && (
            <p className={styles.empty} role="status">
              Loading received reviews...
            </p>
          )}
          {error && (
            <div className={styles.empty}>
              <p role="alert">{error}</p>
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
          {!loading && !error && !visible.length && (
            <div className={styles.empty}>
              <MessageSquare size={30} aria-hidden="true" />
              <strong>{query ? "No matching reviews" : "No guest reviews yet"}</strong>
              <p>
                {query
                  ? "Try another review title, property or reservation."
                  : "Reviews from your guests will appear here after they are published."}
              </p>
            </div>
          )}
          {!loading &&
            !error &&
            visible.map((review) => {
              const property = properties[review.property_id];
              const guestName = typeof review.guest_name === "string" && review.guest_name.trim() ? review.guest_name.trim() : "Guest";
              const initials = guestName.split(/\s+/).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
              const value = rating(review);
              return (
                <article key={review.id} data-review-id={review.id} tabIndex={-1} className={styles.reviewCard}>
                  <PropertyImage property={property} />
                  <div className={styles.cardContent}>
                    <h4>{review.title || property?.title || "Guest review"}</h4>
                    {property && (
                      <p className={styles.location}>
                        <MapPin size={14} aria-hidden="true" />
                        {[property.title, property.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className={styles.ratingLine}>
                      {value !== null && (
                        <>
                          <Stars value={value} />
                          <strong>{value.toFixed(1)}</strong>
                        </>
                      )}
                      {review.verification_status === "VERIFIED_STAY" && (
                        <span className={styles.verified}>Verified stay</span>
                      )}
                    </div>
                    <p className={styles.reviewText}>{review.content ?? review.public_review}</p>
                    <div className={styles.metadata}>
                      <span className={styles.avatar} aria-hidden="true">
                        {initials}
                      </span>
                      <span>{guestName}</span>
                      <time>{dateLabel(review)}</time>
                      {review.booking_id && (
                        <span className={styles.reservation}>Reservation #{review.booking_id}</span>
                      )}
                    </div>
                  {respondableReviews[review.id] && <HostResponseForm review={respondableReviews[review.id]} />}
                  </div>
                </article>
              );
            })}
        </section>
      </div>
      <aside className={styles.sidebar} aria-label="Guest review insights">
        <section className={styles.summary}>
          <div>
            <h3>Overall rating</h3>
            <div className={styles.overall}>
              <Star fill="currentColor" size={36} aria-hidden="true" />
              <strong>{!loading && !error && average !== null ? average.toFixed(1) : "—"}</strong>
            </div>
            <p>
              {loading
                ? "Loading ratings..."
                : error
                  ? "Ratings unavailable"
                  : `Based on ${scores.length} received reviews`}
            </p>
          </div>
          <div className={styles.distribution} aria-label="Rating distribution">
            {[5, 4, 3, 2, 1].map((stars) => {
              const percentage = scores.length
                ? Math.round((scores.filter((value) => Math.round(value) === stars).length / scores.length) * 100)
                : 0;
              return (
                <div key={stars}>
                  <span>
                    {stars} {stars === 1 ? "star" : "stars"}
                  </span>
                  <progress max="100" value={percentage} aria-label={`${stars} stars: ${percentage}%`} />
                  <span>{percentage}%</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className={styles.recent}>
          <header>
            <h3>Recent reviews</h3>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSort("newest");
                listRef.current?.scrollIntoView({ behavior: "smooth" });
              }}>
              View all
            </button>
          </header>
          {!loading &&
            !error &&
            sorted.slice(0, 3).map((review) => (
              <button type="button" key={review.id} className={styles.recentRow} onClick={() => focusReview(review.id)}>
                <PropertyImage property={properties[review.property_id]} />
                <span>
                  <strong>{review.title || properties[review.property_id]?.title || "Guest review"}</strong>
                  <small>{properties[review.property_id]?.location || dateLabel(review)}</small>
                </span>
                <span className={styles.recentScore}>
                  {rating(review) !== null && (
                    <>
                      <Star size={13} fill="currentColor" aria-hidden="true" />
                      {rating(review).toFixed(1)}
                    </>
                  )}
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
          {(loading || error || !sorted.length) && (
            <p className={styles.sidebarEmpty}>
              {loading
                ? "Loading recent feedback..."
                : error
                  ? "Recent feedback unavailable."
                  : "Your latest guest feedback will appear here."}
            </p>
          )}
        </section>
      <CategoryRatings userId={userId} propertyIds={[...Object.keys(properties),
        ...reviews.map((review) => review.property_id).filter((id) => typeof id === "string" && id.trim())]} />
    </aside>
    </div>
  );
}
