import React, { useEffect, useState } from "react";
import { getPropertyRatingTrends } from "../services/reviewAPI";
import { fetchHostPropertySelectOptions } from "../../../services/hostPropertyService";
import styles from "../styles/ReviewPerformance.module.css";
import trendStyles from "../styles/DecliningPropertyRatings.module.css";

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
  const [onlyDeclining, setOnlyDeclining] = useState(true);
  const [data, setData] = useState(null);
  const [names, setNames] = useState({});
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
    fetchHostPropertySelectOptions(userId).then((items) => {
      if (active) setNames(Object.fromEntries(items.map(({ value, label }) => [value, label])));
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
      ...(onlyDeclining ? { status: "DECLINING" } : {}) }).then((result) => {
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
  }, [userId, endDate, debouncedDays, offset, invalid, daysPending, onlyDeclining, retry]);

  const visible = data?.properties.filter((property) => !onlyDeclining || property.trend_status === "DECLINING") || [];
  return <section className={styles.panel} aria-labelledby="rating-trends-heading">
    <h3 id="rating-trends-heading">Properties with declining ratings</h3>
    <div className={styles.controls}>
      <label>Comparison end date<input type="date" value={endDate} max={yesterday()}
        onChange={(event) => { setEndDate(event.target.value); setPageOffsets([0]); }} /></label>
      <label>Days per period<input type="number" min="1" max="366" value={days}
        onChange={(event) => { setDays(event.target.value); setPageOffsets([0]); }} /></label>
    </div>
    <p>Compare two consecutive periods of equal length. Dates include the whole day in UTC.</p>
    <label><input type="checkbox" checked={onlyDeclining} onChange={(event) => {
      setOnlyDeclining(event.target.checked); setPageOffsets([0]);
    }} />Show only declining properties</label>
    {invalid && <p role="alert">Select a date before today and between 1 and 366 days per period.</p>}
    {loading && <p role="status">Loading rating trends...</p>}
    {error && <><p role="alert">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></>}
    {data && <>
      <p>Previous: {data.previous_period.start_date} to {data.previous_period.end_date}.
        Current: {data.current_period.start_date} to {data.current_period.end_date}.</p>
      <p>A decline is a decrease of at least {data.decline_threshold} rating points,
        with at least {data.minimum_reviews_per_period} reviews in each period.</p>
      {!data.properties.length && <p>{onlyDeclining ? "No declining properties in this period." : "No properties available on this page."}</p>}
      {!!data.properties.length && !visible.length && <p>No declining properties on this page. View all trends or check the next page.</p>}
      {!!visible.length && <div className={styles.table}><table><caption>Property rating comparisons</caption>
        <thead><tr>{["Property", "Previous average", "Current average", "Change", "Previous reviews", "Current reviews", "Trend"]
          .map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{visible.map((property) => <tr key={property.property_id}>
          <th scope="row">{names[property.property_id] || property.property_id}</th>
          <td>{score(property.previous_average_rating)}</td><td>{score(property.current_average_rating)}</td>
          <td>{property.rating_change == null ? "Not enough reviews" : `${property.rating_change > 0 ? "+" : ""}${property.rating_change.toFixed(2)}`}</td>
          <td>{property.previous_review_count}</td><td>{property.current_review_count}</td>
          <td className={trendStyles[property.trend_status]}>{labels[property.trend_status] || "Unknown"}</td>
        </tr>)}</tbody>
      </table></div>}
      <div className={trendStyles.pages}>
        <button type="button" disabled={pageOffsets.length === 1} onClick={() => setPageOffsets((pages) => pages.slice(0, -1))}>Previous page</button>
        <span>Page {pageOffsets.length}</span>
        <button type="button" disabled={data.next_offset == null} onClick={() => setPageOffsets((pages) => [...pages, data.next_offset])}>Next page</button>
      </div>
    </>}
  </section>;
}
