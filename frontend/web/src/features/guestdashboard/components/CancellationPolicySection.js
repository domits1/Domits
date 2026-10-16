import React, { useState } from "react";
import PropTypes from "prop-types";
import { parseCancellationPolicyString } from "../../../utils/policyDisplayUtils";

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
  const policy = parseCancellationPolicyString(policyInput);
  return policy?.id ? policy : null;
};

export default CancellationPolicySection;
