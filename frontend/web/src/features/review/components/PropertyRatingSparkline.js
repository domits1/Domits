import React from "react";

export default function PropertyRatingSparkline({ history, declining }) {
  if (!Array.isArray(history) || history.length !== 6 || !history.every((period) =>
    period && Number.isSafeInteger(period.review_count) && period.review_count >= 0
    && (period.review_count === 0 ? period.average_rating === null
      : Number.isFinite(period.average_rating) && period.average_rating >= 1 && period.average_rating <= 5))) {
    return <small>History unavailable</small>;
  }
  const scores = history.map((period) => period.average_rating);
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
