import React, { useEffect, useState } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { fetchHostPropertySelectOptions } from "../../hostdashboard/services/hostTaskPropertyService";
import { getPropertyReviewPerformance } from "../services/reviewAPI";
import styles from "../styles/ReviewPerformance.module.css";
import { ChartNoAxesCombined, Clock3, Star } from "lucide-react";
import CategoryRatings from "../components/categoryRatings";
const STAR_COLORS = { 1: "#ff6655", 2: "#ffbf43", 3: "#c4e6c9", 4: "#70bd7b", 5: "#009d12" };

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
    fetchHostPropertySelectOptions(userId)
      .then((items) => {
        if (active) setProperties(items);
      })
      .catch(() => {
        if (active) setPropertyError("Could not load your properties. Please try again.");
      })
      .finally(() => {
        if (active) setPropertiesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, propertyRetry]);

  useEffect(() => {
    let active = true;
    setPoints(null);
    setError("");
    setLoading(false);
    if (invalidRange || propertiesLoading || propertyError || !properties.length)
      return () => {
        active = false;
      };
    setLoading(true);
    const ids = propertyId ? [propertyId] : [...new Set(properties.map((property) => property.value))];
    Promise.all(ids.map((id) => getPropertyReviewPerformance({ propertyId: id, startDate, endDate, interval })))
      .then((results) => {
        const periods = new Map();
        for (const data of results) {
          if (!Array.isArray(data?.periods)) throw new Error("Could not load review performance. Please try again.");
          for (const point of data.periods) {
            const current = periods.get(point.period) || { ...point, review_count: 0, weightedScore: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, distributionAvailable: true };
            if (point.review_count && !point.rating_distribution) current.distributionAvailable = false;
            for (const stars of [1, 2, 3, 4, 5]) current.rating_distribution[stars] += point.rating_distribution?.[stars] ?? 0;
            current.review_count += point.review_count;
            current.weightedScore += (point.average_score ?? 0) * point.review_count;
            periods.set(point.period, current);
          }
        }
        if (active) setPoints([...periods.values()].sort((a, b) => a.period.localeCompare(b.period))
          .map(({ weightedScore, ...point }) => ({ ...point, average_score: point.review_count ? weightedScore / point.review_count : null })));
      })
      .catch((failure) => {
        if (active) setError(failure.message || "Could not load review performance. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [propertyId, startDate, endDate, interval, invalidRange, retry, properties, propertiesLoading, propertyError]);

  const change = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));
  const reviewCount = points?.reduce((sum, point) => sum + point.review_count, 0) ?? 0;
  const ratedPeriods = points?.filter((point) => point.review_count > 0 && point.average_score != null) ?? [];
  const average = reviewCount
    ? ratedPeriods.reduce((sum, point) => sum + point.average_score * point.review_count, 0) / reviewCount
    : null;
  const latest = ratedPeriods[ratedPeriods.length - 1]?.average_score;
  const periodLabel = (value) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
      ...(interval === "year" ? {} : { month: "short" }),
      year: "numeric",
      ...(interval === "week" ? { day: "numeric" } : {}),
      timeZone: "UTC",
    });
  return (
    <section className={styles.panel} aria-labelledby="performance-heading">
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.headingIcon}>
            <ChartNoAxesCombined size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Guest experience</span>
            <h3 id="performance-heading">Review performance over time</h3>
            <p className={styles.subtitle}>See how guest ratings evolve for each property.</p>
          </div>
        </div>
        <span className={styles.meta}>
          <Clock3 size={14} aria-hidden="true" /> UTC reporting
        </span>
      </header>
      <div className={`${styles.controls} ${styles.performanceControls}`}>
        <label>
          Property
          <select value={propertyId} onChange={change("propertyId")} disabled={propertiesLoading}>
            <option value="">All Properties</option>
            {properties.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Start date
          <input type="date" value={startDate} onChange={change("startDate")} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={change("endDate")} />
        </label>
        <label>
          Interval
          <select value={interval} onChange={change("interval")}>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>
      </div>
      <p className={styles.hint}>Dates include the entire selected day in UTC. Weeks start on Monday.</p>
      {propertiesLoading && <p role="status">Loading properties...</p>}
      {!propertiesLoading && !propertyError && !properties.length && <p>No properties available.</p>}
      {invalidRange && <p role="alert">Select a start date on or before the end date.</p>}
      {(propertyError || error) && <p role="alert">{propertyError || error}</p>}
      {(propertyError || error) && (
        <button
          type="button"
          onClick={() => (propertyError ? setPropertyRetry((value) => value + 1) : setRetry((value) => value + 1))}>
          Try again
        </button>
      )}
      {loading && <p role="status">Loading review performance...</p>}
      {points && (
        <>
          {!points.some((point) => point.review_count > 0) && <p>No eligible reviews in this date range.</p>}
          <div className={styles.metrics}>
            {[
              {
                label: "Overall rating",
                value: average == null ? "—" : average.toFixed(1),
                note: "Weighted across selected periods",
                icon: <Star size={30} fill="currentColor" />,
              },
              {
                label: "Total reviews",
                value: reviewCount,
                note: "In the selected date range",
                icon: <ChartNoAxesCombined size={28} />,
              },
              {
                label: "Periods with reviews",
                value: `${ratedPeriods.length} / ${points.length}`,
                note: "Periods with eligible guest feedback",
                icon: <Clock3 size={28} />,
              },
              {
                label: "Latest period rating",
                value: latest == null ? "—" : latest.toFixed(1),
                note: "Most recent period with reviews",
                icon: <Star size={28} />,
              },
            ].map((metric) => (
              <div className={styles.metric} key={metric.label}>
                <span className={styles.metricIcon} aria-hidden="true">
                  {metric.icon}
                </span>
                <div>
                  <h4>{metric.label}</h4>
                  <strong>{metric.value}</strong>
                  <p>{metric.note}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.performanceResults}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeading}>
                <h4>Review performance over time</h4>
                <div className={styles.chartLegends}>
                  <span className={styles.barLegend}>Number of reviews</span>
                  <span className={styles.legend}>Average rating</span>
                </div>
              </div>
              <div
                className={styles.chart}
                role="img"
                aria-label="Average review score over time; values are listed in the table below">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={points} margin={{ top: 16, right: 5, bottom: 16, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e8eeeb" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickFormatter={periodLabel}
                      minTickGap={30}
                      axisLine={{ stroke: "#a3b5a9", strokeWidth: 2 }}
                      tickLine={false}
                      tick={{ fill: "#3f5949", fontSize: 12, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="count"
                      allowDecimals={false}
                      label={{ value: "Number of reviews", angle: -90, position: "insideLeft", style: { fill: "#3f5949", fontSize: 11, fontWeight: 600, textAnchor: "middle" } }}
                      axisLine={{ stroke: "#a3b5a9", strokeWidth: 2 }}
                      tickLine={false}
                      width={56}
                      tick={{ fill: "#65756c", fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="rating"
                      orientation="right"
                      label={{ value: "Average rating", angle: 90, position: "insideRight", style: { fill: "#3f5949", fontSize: 11, fontWeight: 600, textAnchor: "middle" } }}
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      axisLine={{ stroke: "#a3b5a9", strokeWidth: 2 }}
                      tickLine={false}
                      width={56}
                      tick={{ fill: "#65756c", fontSize: 11 }}
                    />
                    <Tooltip
                      itemStyle={{ color: "#244c32", fontWeight: 600 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e9e5",
                        boxShadow: "0 8px 24px #183e2410",
                      }}
                    />
                    <Bar
                      yAxisId="count"
                      dataKey="review_count"
                      name="Number of reviews"
                      fill="#79bd87"
                      stroke="#519d62"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="rating"
                      dataKey="average_score"
                      name="Average rating"
                      stroke="#009d12"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className={styles.hint}>Gaps indicate periods without eligible reviews.</p>
            </div>
            <div className={styles.performanceBottom}>
              <section className={styles.distributionCard} aria-labelledby="distribution-heading">
                <h4 id="distribution-heading">Rating distribution over time</h4>
                {points.every((point) => point.distributionAvailable) ? <div className={styles.distributionLayout}>
                  <div className={styles.distributionChart} role="img" aria-label="Percentage of reviews by star rating for each period">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={points.map((point) => ({ ...point, ...Object.fromEntries([1, 2, 3, 4, 5].map((stars) =>
                        [`stars_${stars}`, point.review_count ? point.rating_distribution[stars] / point.review_count * 100 : 0])) }))}
                        margin={{ top: 12, right: 4, bottom: 12, left: 0 }}>
                        <XAxis dataKey="period" tickFormatter={periodLabel} tick={{ fontSize: 10, fill: "#3f5949", fontWeight: 600 }} axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} width={38} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                        {[1, 2, 3, 4, 5].map((stars) => <Bar key={stars} dataKey={`stars_${stars}`} name={`${stars} ${stars === 1 ? "star" : "stars"}`} stackId="distribution" fill={STAR_COLORS[stars]} maxBarSize={26} isAnimationActive={false} />)}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.distributionLegend}>{[5, 4, 3, 2, 1].map((stars) => <span key={stars}><i style={{ background: STAR_COLORS[stars] }} />{stars} {stars === 1 ? "star" : "stars"}</span>)}</div>
                </div> : <p className={styles.hint}>Rating distribution is unavailable for this period.</p>}
              </section>
              <div className={`${styles.table} ${styles.srOnly}`} role="region" aria-label="Review performance table">
                <table>
                  <caption>Review performance by period</caption>
                  <thead>
                    <tr>
                      <th scope="col">Period start (UTC)</th>
                      <th scope="col">Average score</th>
                      <th scope="col">Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.period}>
                        <th scope="row">{point.period}</th>
                        <td>{point.average_score == null ? "No score" : point.average_score.toFixed(2)}</td>
                        <td>{point.review_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.categorySummary}>
                <p className={styles.hint}>All-time category ratings for the selected property</p>
                <CategoryRatings userId={userId} propertyIds={propertyId ? [propertyId] : properties.map((property) => property.value)} />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
