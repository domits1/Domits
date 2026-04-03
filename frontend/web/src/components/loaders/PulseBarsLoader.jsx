import React from "react";
import PropTypes from "prop-types";
import "./PulseBarsLoader.scss";

const buildClassName = (inline, className) =>
  ["pulse-bars-loader", inline ? "pulse-bars-loader--inline" : "", className]
    .filter(Boolean)
    .join(" ");

export default function PulseBarsLoader({ message, inline = false, className = "" }) {
  return (
    <div className={buildClassName(inline, className)} role="status" aria-live="polite">
      <div className="pulse-bars-loader__bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {message ? <p className="pulse-bars-loader__text">{message}</p> : null}
    </div>
  );
}

PulseBarsLoader.propTypes = {
  message: PropTypes.string,
  inline: PropTypes.bool,
  className: PropTypes.string,
};