import React, { useState } from "react";
import PropTypes from "prop-types";

const GUEST_CANCELLATION_POLICY_COPY = {
  flexible: {
    id: "flexible",
    type: "Flexible",
    summary: "Full refund 1 day prior to arrival.",
    details: [
      "Guests receive a full refund when they cancel at least 1 day before check-in.",
      "Cancellations made less than 1 day before check-in are non-refundable.",
    ],
  },
  moderate: {
    id: "moderate",
    type: "Moderate",
    summary: "Full refund 5 days prior to arrival.",
    details: [
      "Guests receive a full refund when they cancel at least 5 days before check-in.",
      "Cancellations made fewer than 5 days before check-in may receive only a partial refund.",
    ],
  },
  strict: {
    id: "strict",
    type: "Limited",
    summary: "Refunds depend on how close the cancellation is to check-in.",
    details: [
      "At least 14 days before check-in: guest receives 100% refund (you keep 0%).",
      "In between 7 and 14 days before check-in: guest receives 50% refund (you keep 50%).",
      "Less than 7 days before check-in: guest receives no refund (you keep 100%).",
    ],
  },
  firm: {
    id: "firm",
    type: "Firm",
    summary: "Full refund up to 30 days before check-in.",
    details: [
      "Guests receive a full refund when they cancel at least 30 days before check-in.",
      "Cancellations closer to arrival may receive only a partial refund or no refund, depending on timing.",
    ],
  },
};

function CancellationPolicySection({ policy }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!policy) {
    return null;
  }

  const details = Array.isArray(policy.details) ? policy.details : [];

  return (
    <section className="card cancellationPolicyCard">
      <div className="cancellationPolicyHeader">
        <h3>Cancellation Policy</h3>
        <span className={`cancellationPolicyBadge cancellationPolicyBadge--${policy.id || "default"}`}>
          {policy.type}
        </span>
      </div>

      <p className="cancellationPolicySummary">{policy.summary}</p>

      <button
        type="button"
        className="cancellationPolicyToggle"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}>
        {isExpanded ? "Hide policy details" : "View policy details"}
      </button>

      {isExpanded ? (
        <div className="cancellationPolicyDetails">
          {details.map((detail) => (
            <p key={detail}>{detail}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

CancellationPolicySection.propTypes = {
  policy: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    summary: PropTypes.string,
    details: PropTypes.arrayOf(PropTypes.string),
  }),
};

CancellationPolicySection.defaultProps = {
  policy: null,
};

export const resolveGuestCancellationPolicy = (policyInput = "") => {
  const normalizedId = String(policyInput || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "_")
    .replaceAll("-", "_");
  return GUEST_CANCELLATION_POLICY_COPY[normalizedId] || null;
};

export default CancellationPolicySection;
