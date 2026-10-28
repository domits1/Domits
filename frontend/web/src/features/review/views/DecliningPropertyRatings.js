import React, { useEffect, useState } from "react";
import { getPropertyRatingTrends } from "../services/reviewAPI";
import { fetchHostPropertySelectOptions } from "../../../services/hostPropertyService";
import styles from "../styles/ReviewPerformance.module.css";
import trendStyles from "../styles/DecliningPropertyRatings.module.css";
import PropertyRatingSparkline from "../components/PropertyRatingSparkline";
import { TrendingDown, ArrowRight, SlidersHorizontal, Building2, Star, MessageSquare } from "lucide-react";

const labels = { DECLINING: "Declining", STABLE: "Stable", IMPROVING: "Improving", INSUFFICIENT_DATA: "Insufficient data" };
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const score = (value) => value == null ? "No score" : value.toFixed(2);
const validPeriod = (period) => [period?.start_date, period?.end_date].every((value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
const validScore = (value) => value === null || Number.isFinite(value);
const validProperty = (property) => property && typeof property.property_id === "string"
  && [property.previous_average_rating, property.current_average_rating, property.rating_change].every(validScore)
  && [property.previous_review_count, property.current_review_count].every((value) => Number.isSafeInteger(value) && value >= 0);

export default function DecliningPropertyRatings({ userId }) {
  const [endDate, setEndDate] = useState(yesterday);
  const [days, setDays] = useState("30");
  const [debouncedDays, setDebouncedDays] = useState(days);
  const [pageOffsets, setPageOffsets] = useState([0]);
  const offset = pageOffsets[pageOffsets.length - 1];
  const [data, setData] = useState(null);
  const [names, setNames] = useState({});
  const [listings, setListings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const invalid = !endDate || endDate > yesterday() || !/^[1-9]\d*$/.test(days) || Number(days) > 366;
  const daysPending = days !== debouncedDays;

  useEffect(() => {
    if (days === debouncedDays) return undefined;
    const timer = setTimeout(() => setDebouncedDays(days), 300);
    return () => clearTimeout(timer);
  }, [days, debouncedDays]);

  useEffect(() => {
    let active = true;
    setNames({});
    setListings({});
    fetchHostPropertySelectOptions(userId).then((items) => {
      if (active) setNames(Object.fromEntries(items.map(({ value, label }) => [value, label])));
      if (active) setListings(Object.fromEntries(items.map((item) => [item.value, item])));
    }).catch(() => {}); // Property IDs remain usable when listing names are unavailable.
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    setLoading(false);
    if (invalid || daysPending) return () => { active = false; };
    setLoading(true);
    getPropertyRatingTrends({ endDate, days: debouncedDays, offset: String(offset),
      status: "DECLINING" }).then((result) => {
      if (!Array.isArray(result?.properties) || !result.properties.every(validProperty)
        || !validPeriod(result.previous_period) || !validPeriod(result.current_period)
        || !Number.isFinite(result.decline_threshold) || result.decline_threshold <= 0
        || !Number.isSafeInteger(result.minimum_reviews_per_period) || result.minimum_reviews_per_period < 1
        || !(result.next_offset == null || (Number.isSafeInteger(result.next_offset) && result.next_offset > offset))) {
        throw new Error("Could not load rating trends. Please try again.");
      }
      if (active) setData(result);
    }).catch((failure) => {
      if (active) setError(failure.message || "Could not load rating trends. Please try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, endDate, debouncedDays, offset, invalid, daysPending, retry]);

  const declining = data?.properties.filter((property) => property.trend_status === "DECLINING") || [];
  const totalReviews = declining.reduce((sum, property) => sum + property.current_review_count, 0);
  const previousReviews = declining.reduce((sum, property) => sum + property.previous_review_count, 0);
  const average = totalReviews ? declining.reduce((sum, property) => sum + (property.current_average_rating ?? 0) * property.current_review_count, 0) / totalReviews : null;
  const previousAverage = previousReviews ? declining.reduce((sum, property) => sum + (property.previous_average_rating ?? 0) * property.previous_review_count, 0) / previousReviews : null;
  const averageChange = average != null && previousAverage != null ? average - previousAverage : null;
  const reviewsChange = previousReviews ? (totalReviews - previousReviews) / previousReviews * 100 : null;
  const changeLabel = (value, suffix = "") => value == null ? "—" : `${value < 0 ? "↓" : value > 0 ? "↑" : ""} ${Math.abs(value).toFixed(suffix ? 0 : 2)}${suffix}`;
  return <section className={styles.panel} aria-labelledby="rating-trends-heading">
    <header className={styles.header}>
      <div className={styles.headingGroup}>
        <span className={`${styles.headingIcon} ${trendStyles.headingIcon}`}><TrendingDown size={22} aria-hidden="true" /></span>
        <div><span className={styles.eyebrow}>Portfolio insights</span>
          <h3 id="rating-trends-heading">Properties with declining ratings</h3>
          <p className={styles.subtitle}>Spot changes early and focus on the properties that need attention.</p>
        </div>
      </div>
      <span className={styles.meta}><SlidersHorizontal size={14} aria-hidden="true" /> Period comparison</span>
    </header>
    <div className={styles.controls}>
      <label>Comparison end date<input type="date" value={endDate} max={yesterday()}
        onChange={(event) => { setEndDate(event.target.value); setPageOffsets([0]); }} /></label>
      <label>Days per period<select value={days}
        onChange={(event) => { setDays(event.target.value); setPageOffsets([0]); }}>
        {[7, 14, 30, 60, 90, 180, 365, 366].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
    <p className={styles.hint}>Compare two consecutive periods of equal length. Dates include the whole day in UTC.</p>
    {invalid && <p role="alert">Select a date before today and between 1 and 366 days per period.</p>}
    {loading && <p role="status">Loading rating trends...</p>}
    {error && <><p role="alert">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></>}
    <>
      <div className={trendStyles.summaryGrid}>
        {[
          { label: "Properties with declining ratings", value: data ? declining.length : "—", icon: <Building2 />, note: "On this page" },
          { label: "Average rating (declining)", value: average === null ? "—" : average.toFixed(1), icon: <Star />, note: "vs. previous period · this page", change: changeLabel(averageChange) },
          { label: "Total reviews (declining properties)", value: data ? totalReviews : "—", icon: <MessageSquare />, note: "vs. previous period · this page", change: changeLabel(reviewsChange, "%") },
        ].map((metric) => <div className={trendStyles.summaryCard} key={metric.label}>
          <span className={trendStyles.summaryIcon} aria-hidden="true">{metric.icon}</span>
          <div><h4>{metric.label}</h4><strong>{metric.value}</strong>{metric.change && <span className={trendStyles.comparisonBadge}>{metric.change}</span>}<p>{metric.note}</p></div>
        </div>)}
      </div>
      {data && <><div className={trendStyles.periods}>
        <div><span>Previous period</span><strong>{data.previous_period.start_date} to {data.previous_period.end_date}</strong></div>
        <ArrowRight size={20} aria-hidden="true" />
        <div><span>Current period</span><strong>{data.current_period.start_date} to {data.current_period.end_date}</strong></div>
      </div>
      <p className={trendStyles.policy}>A decline is a decrease of at least {data.decline_threshold} rating points,
        with at least {data.minimum_reviews_per_period} reviews in each period.</p>
      {!data.properties.length && <div className={styles.empty}><span className={styles.emptyIcon}><TrendingDown size={24} aria-hidden="true" /></span>
        <strong>No declining properties in this period.</strong>
        <p>Adjust the comparison period to explore your portfolio.</p></div>}
      {!!data.properties.length && !declining.length && <p>No declining properties on this page. Check the next page.</p>}
      </>}
      <div className={styles.table} tabIndex={0} role="region" aria-label="Scrollable property rating comparisons"><table><caption>Property rating comparisons</caption>
        <thead><tr>{["Property", "Current rating", "Previous rating", "Change", "Total reviews", "Trend (last 6 periods)"]
          .map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{!data && <tr><td colSpan={6}>{loading ? "Loading property comparisons..." : invalid ? "Choose a valid comparison period to load properties." : error ? "Property comparisons are currently unavailable. Please try again." : "Waiting for property comparisons..."}</td></tr>}{declining.map((property) => <tr key={property.property_id}>
          <th scope="row"><div className={trendStyles.propertyCell}>
            <span className={trendStyles.propertyImage}>{listings[property.property_id]?.previewImages?.[0]
              ? <img src={listings[property.property_id].previewImages[0]} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              : <Building2 size={24} aria-hidden="true" />}</span>
            <span><strong>{listings[property.property_id]?.title || names[property.property_id] || property.property_id}</strong>
              {listings[property.property_id]?.location && <small>{listings[property.property_id].location}</small>}</span>
          </div></th>
          <td>{score(property.current_average_rating)}</td><td>{score(property.previous_average_rating)}</td>
          <td><span className={`${trendStyles.change} ${trendStyles[property.trend_status] || ""}`}>{property.rating_change == null ? "Not enough reviews" : `${property.rating_change > 0 ? "+" : ""}${property.rating_change.toFixed(2)}`}</span></td>
          <td>{property.current_review_count}<span className={trendStyles.comparisonBadge}>{changeLabel(property.previous_review_count ? (property.current_review_count - property.previous_review_count) / property.previous_review_count * 100 : null, "%")}</span></td>
          <td><div className={trendStyles.trendCell}>
            <PropertyRatingSparkline history={property.history} declining={property.trend_status === "DECLINING"} />
            <span className={`${trendStyles.badge} ${trendStyles[property.trend_status] || ""}`}>{labels[property.trend_status] || "Unknown"}</span>
          </div></td>
        </tr>)}</tbody>
      </table></div>
      {data && <div className={trendStyles.pages}>
        <button type="button" disabled={pageOffsets.length === 1} onClick={() => setPageOffsets((pages) => pages.slice(0, -1))}>Previous page</button>
        <span>Page {pageOffsets.length}</span>
        <button type="button" disabled={data.next_offset == null} onClick={() => setPageOffsets((pages) => [...pages, data.next_offset])}>Next page</button>
      </div>}
    </>
  </section>;
}
