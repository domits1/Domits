import React from "react";

const buildClassName = (isInline, className) =>
  ["hc-pulse-loader", isInline ? "hc-pulse-loader--inline" : "", className]
    .filter(Boolean)
    .join(" ");

export default function PulseBarsLoader({ message, inline = false, className = "" }) {
  return (
    <div className={buildClassName(inline, className)} role="status" aria-live="polite">
      <div className="hc-pulse-loader-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {message ? <p className="hc-pulse-loader-text">{message}</p> : null}
    </div>
  );
}
