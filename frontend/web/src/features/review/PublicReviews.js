import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Filter, ChevronUp, ChevronDown, X } from "lucide-react";
import ReviewsSection from "./ReviewsSection";
import { getPublicReviews } from "./services/reviewAPI";
import styles from "./PublicReviewFilters.module.css";

const defaults = { minRating: "", maxRating: "", startDate: "", endDate: "", sort: "recent" };
const PropertyReviews = ({ propertyId }) => {
  const [filters, setFilters] = useState(defaults);
  const [draft, setDraft] = useState(defaults);
  const [expanded, setExpanded] = useState(true);
  const [offset, setOffset] = useState(0);
  const [cursors, setCursors] = useState([null]);
  const cursor = cursors[cursors.length - 1], recent = filters.sort === "recent";
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    getPublicReviews(propertyId, recent ? 0 : offset, controller.signal,
      { ...filters, ...(recent && cursor ? { cursor } : {}) })
      .then((data) => { if (!controller.signal.aborted) setState({ data, loading: false }); })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [propertyId, offset, filters, cursor, recent, attempt]);
  const apply = (next) => {
    setState({ loading: true });
    setOffset(0);
    setCursors([null]);
    setFilters({ ...next });
  };
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const clear = () => { setDraft({ ...defaults }); apply(defaults); };
  const remove = (keys) => {
    const next = { ...filters };
    keys.forEach((key) => { next[key] = defaults[key]; });
    setDraft((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, defaults[key]])) }));
    apply(next);
  };
  const sortLabels = { recent: "Most recent", highest: "Highest rating", lowest: "Lowest rating" };
  const rangeError = draft.minRating && draft.maxRating && Number(draft.minRating) > Number(draft.maxRating)
    ? "Minimum rating must not exceed maximum rating."
    : draft.startDate && draft.endDate && draft.startDate > draft.endDate
      ? "From date must be on or before To date." : "";
  const { data } = state;
  return <section id="listing-reviews" className="listing-section-block">
    <div className={styles.filters}>
      <div className={styles.header}>
        <span className={styles.icon}><Filter size={26} strokeWidth={2.5} aria-hidden="true" /></span>
        <div className={styles.heading}>
          <h3 id="review-filter-title">Filter guest reviews</h3>
          <p>Refine reviews to find the feedback that matters to you.</p>
        </div>
        <button type="button" className={styles.toggle} aria-expanded={expanded}
          aria-controls="review-filter-controls" aria-label={expanded ? "Collapse review filters" : "Expand review filters"}
          onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </button>
      </div>
      <div id="review-filter-controls" hidden={!expanded}>
        <form className={styles.controls} aria-labelledby="review-filter-title"
          onSubmit={(event) => { event.preventDefault(); if (!rangeError) apply(draft); }}>
          {["minRating", "maxRating"].map((key) => <label key={key}>
            {key === "minRating" ? "Minimum rating" : "Maximum rating"}
            <select value={draft[key]} onChange={(event) => change(key, event.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
            </select>
          </label>)}
          <label>From date<input type="date" value={draft.startDate} max={draft.endDate || undefined}
            onChange={(event) => change("startDate", event.target.value)} /></label>
          <label>To date<input type="date" value={draft.endDate} min={draft.startDate || undefined}
            onChange={(event) => change("endDate", event.target.value)} /></label>
          <label>Sort reviews<select value={draft.sort} onChange={(event) => change("sort", event.target.value)}>
            {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <button className={styles.clear} type="button" onClick={clear}>Clear filters</button>
          <button className={styles.apply} type="submit" disabled={Boolean(rangeError)} aria-describedby={rangeError ? "review-filter-error" : undefined}>Apply filters</button>
        </form>
        {rangeError && <p id="review-filter-error" className={styles.validation} role="alert">{rangeError}</p>}
        <div className={styles.active} aria-label="Active filters">
          <strong>Active filters:</strong>
          {(filters.minRating || filters.maxRating) && <button type="button" className={styles.chip}
            onClick={() => remove(["minRating", "maxRating"])} aria-label="Remove rating filter">
            Rating: {filters.minRating || "1"} – {filters.maxRating || "5"} <span className={styles.star}>★</span><X size={15} />
          </button>}
          {(filters.startDate || filters.endDate) && <button type="button" className={styles.chip}
            onClick={() => remove(["startDate", "endDate"])} aria-label="Remove date filter">
            Dates: {filters.startDate || "Any"} – {filters.endDate || "Any"}<X size={15} />
          </button>}
          <button type="button" className={styles.chip} onClick={() => remove(["sort"])} aria-label="Reset review sorting">
            Sort: {sortLabels[filters.sort]}<X size={15} />
          </button>
        </div>
      </div>
    </div>
    {state.loading && <output className={styles.loading}>Loading guest reviews…</output>}
    {state.error && <div role="alert">{state.error}
      <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
    </div>}
    {data && <>
    <p className={styles.matchCount} aria-live="polite">{data.matching_count} matching reviews</p>
    {data.matching_count === 0 && <p className={styles.empty}>No reviews match your selected filters.</p>}
    <ReviewsSection overallRating={data.overall_score} totalReviews={data.review_count}
      reviews={data.reviews.map((review) => ({ ...review,
        timeAgo: new Date(review.date).toLocaleDateString() }))} emptyMessage="" />
    {(recent ? cursors.length > 1 : offset > 0) && <button type="button" className="reviews-section__show-all-btn"
      onClick={() => {
        setState({ loading: true });
        if (recent) setCursors((current) => current.slice(0, -1));
        else setOffset((current) => current - 10);
      }}>Previous reviews</button>}
    {(recent ? Boolean(data.next_cursor) : data.next_offset != null) && <button type="button" className="reviews-section__show-all-btn"
      onClick={() => {
        setState({ loading: true });
        if (recent) setCursors((current) => [...current, data.next_cursor]);
        else setOffset(data.next_offset);
      }}>Next reviews</button>}
    </>}
  </section>;
};
const PublicReviews = ({ propertyId }) => <PropertyReviews key={propertyId} propertyId={propertyId} />;
PropertyReviews.propTypes = { propertyId: PropTypes.string.isRequired };
PublicReviews.propTypes = { propertyId: PropTypes.string.isRequired };
export default PublicReviews;
