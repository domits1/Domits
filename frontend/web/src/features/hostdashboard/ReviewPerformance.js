import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { fetchHostPropertySelectOptions } from "./services/hostTaskPropertyService";
import { getPropertyReviewPerformance } from "../review/services/reviewAPI";
import styles from "./ReviewPerformance.module.css";

const defaults = () => {
  const today = new Date().toISOString().slice(0, 10);
  return { propertyId: "", startDate: `${today.slice(0, 4)}-01-01`, endDate: today, interval: "month" };
};

export default function ReviewPerformance({ userId }) {
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState(defaults);
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [error, setError] = useState("");
  const [propertyError, setPropertyError] = useState("");
  const [retry, setRetry] = useState(0);
  const [propertyRetry, setPropertyRetry] = useState(0);
  const { propertyId, startDate, endDate, interval } = filters;
  const invalidRange = !startDate || !endDate || startDate > endDate;

  useEffect(() => {
    let active = true;
    setPropertiesLoading(true);
    setPropertyError("");
    setProperties([]);
    setFilters(defaults());
    fetchHostPropertySelectOptions(userId).then((items) => {
      if (active) setProperties(items);
    }).catch(() => {
      if (active) setPropertyError("Could not load your properties. Please try again.");
    }).finally(() => { if (active) setPropertiesLoading(false); });
    return () => { active = false; };
  }, [userId, propertyRetry]);

  useEffect(() => {
    let active = true;
    setPoints(null);
    setError("");
    setLoading(false);
    if (!propertyId || invalidRange) return () => { active = false; };
    setLoading(true);
    getPropertyReviewPerformance({ propertyId, startDate, endDate, interval }).then((data) => {
      if (!Array.isArray(data?.periods)) throw new Error("Could not load review performance. Please try again.");
      if (active) setPoints(data.periods);
    }).catch((failure) => {
      if (active) setError(failure.message || "Could not load review performance. Please try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [propertyId, startDate, endDate, interval, invalidRange, retry]);

  const change = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));
  return <section className={styles.panel} aria-labelledby="performance-heading">
    <h3 id="performance-heading">Review performance over time</h3>
    <div className={styles.controls}>
      <label>Property<select value={propertyId} onChange={change("propertyId")} disabled={propertiesLoading}>
        <option value="">Select a property</option>
        {properties.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Start date<input type="date" value={startDate} onChange={change("startDate")} /></label>
      <label>End date<input type="date" value={endDate} onChange={change("endDate")} /></label>
      <label>Interval<select value={interval} onChange={change("interval")}>
        <option value="week">Week</option><option value="month">Month</option><option value="year">Year</option>
      </select></label>
    </div>
    <p>Dates include the entire selected day in UTC. Weeks start on Monday.</p>
    {propertiesLoading && <p role="status">Loading properties...</p>}
    {!propertiesLoading && !propertyError && !properties.length && <p>No properties available.</p>}
    {invalidRange && <p role="alert">Select a start date on or before the end date.</p>}
    {(propertyError || error) && <p role="alert">{propertyError || error}</p>}
    {(propertyError || error) && <button type="button" onClick={() => propertyError
      ? setPropertyRetry((value) => value + 1) : setRetry((value) => value + 1)}>Try again</button>}
    {loading && propertyId && <p role="status">Loading review performance...</p>}
    {points && <>
      {!points.some((point) => point.review_count > 0) && <p>No eligible reviews in this date range.</p>}
      <div className={styles.chart} role="img" aria-label="Average review score over time; values are listed in the table below">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" minTickGap={30} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} /><Tooltip />
            <Line dataKey="average_score" name="Average score" stroke="#0D9813" connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.table}><table><caption>Review performance by period</caption>
        <thead><tr><th scope="col">Period start (UTC)</th><th scope="col">Average score</th><th scope="col">Reviews</th></tr></thead>
        <tbody>{points.map((point) => <tr key={point.period}><th scope="row">{point.period}</th>
          <td>{point.average_score == null ? "No score" : point.average_score.toFixed(2)}</td><td>{point.review_count}</td></tr>)}</tbody>
      </table></div>
    </>}
  </section>;
}
