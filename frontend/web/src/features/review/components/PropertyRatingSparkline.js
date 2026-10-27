import React, { useEffect, useState } from "react";
import { getPropertyReviewPerformance } from "../services/reviewAPI";

export default function PropertyRatingSparkline({ propertyId, endDate, days, declining }) {
  const [scores, setScores] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setScores(null);
    setFailed(false);
    (async () => {
      const values = [];
      const endExclusive = Date.parse(`${endDate}T00:00:00Z`) + 86400000;
      // Exact adjacent windows match the selected comparison length, including partial calendar months.
      for (let index = 5; index >= 0; index--) {
        if (!active) return;
        const end = endExclusive - index * days * 86400000;
        const start = end - days * 86400000;
        const result = await getPropertyReviewPerformance({ propertyId, interval: "month",
          startDate: new Date(start).toISOString().slice(0, 10), endDate: new Date(end - 1).toISOString().slice(0, 10) });
        if (!Array.isArray(result?.periods)) throw new Error("Missing history");
        const count = result.periods.reduce((sum, period) => sum + period.review_count, 0);
        values.push(count ? result.periods.reduce((sum, period) => sum + (period.average_score ?? 0) * period.review_count, 0) / count : null);
      }
      if (active) setScores(values);
    })().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [propertyId, endDate, days]);
  if (failed) return <small>History unavailable</small>;
  if (!scores) return <small>Loading history...</small>;
  const color = declining ? "#e33232" : "#23844b";
  return <svg viewBox="0 0 160 48" role="img" aria-label={`Last six periods: ${scores.map((value) => value == null ? "no reviews" : value.toFixed(2)).join(", ")}`}>
    {scores.map((value, index) => {
      if (value == null) return null;
      const x = 8 + index * 28;
      const y = 42 - value * 7;
      const previous = scores[index - 1];
      return <g key={index}>
        {index > 0 && previous != null && <>
          <path d={`M ${x - 28} ${42 - previous * 7} L ${x} ${y} L ${x} 48 L ${x - 28} 48 Z`} fill={declining ? "#ffeded" : "#eaf7ed"} />
          <path d={`M ${x - 28} ${42 - previous * 7} L ${x} ${y}`} fill="none" stroke={color} strokeWidth="2" />
        </>}
        <circle cx={x} cy={y} r="2.5" fill={color} />
      </g>;
    })}
  </svg>;
}
