import React from "react";
import { Star } from "lucide-react";

export default function RatingStars({ value, size = 17, className }) {
  return <span className={className} aria-label={`${value} out of 5 stars`}>
    {[0, 1, 2, 3, 4].map((index) => {
      const fill = Math.max(0, Math.min(1, value - index));
      return <span key={index} aria-hidden="true" style={{ position: "relative", display: "inline-flex", width: size, height: size }}>
        <Star size={size} fill="none" />
        <Star size={size} fill="currentColor" style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }} />
      </span>;
    })}
  </span>;
}
