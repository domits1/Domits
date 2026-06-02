import React, { useState } from "react";
import PropTypes from "prop-types";
import "./ListingCancellationPolicy.css";

const CANCELLATION_POLICIES = [
  {
    id: "flexible",
    name: "Flexible",
    summary: "Full refund until 1 day before check-in",
    rules: ["At least 1 day before check-in, guests receive 100% refund", "Less than 1 day before check-in, no refund"],
    important:
      "Your payout is processed once the booking becomes non-refundable (within 24 hours of check-in). You should receive your payout within 3 days of processing.",
  },
  {
    id: "moderate",
    name: "Moderate",
    summary: "Full refund until 5 days before check-in",
    rules: [
      "At least 5 days before check-in, guests receive 100% refund",
      "Less than 5 days before check-in, guests receive a 50% refund",
    ],
  },
  {
    id: "strict",
    name: "Strict",
    summary: "Full refund until 30 days before check-in",
    rules: [
      "At least 30 days before check-in, guests receive a 70% refund",
      "Less than 30 days before check-in, no refund",
    ],
  },
  {
    id: "firm",
    name: "Firm",
    summary: "Full refund until 30 days before check-in",
    rules: [
      "At least 30 days before check-in, guests receive 100% refund",
      "Between 7-30 days before check-in, guests receive 50% refund",
      "Less than 7 days before check-in, no refund",
    ],
  },
];

const ListingCancellationPolicy = ({ policyId = "flexible" }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const policy = CANCELLATION_POLICIES.find((p) => p.id === policyId) || CANCELLATION_POLICIES[0];

  return (
    <div className="listing-cancellation-policy">
      <h3 className="policy-section-title">Cancellation Policy</h3>

      <div className="policy-card">
        <div className="policy-header">
          <div className="policy-badge">{policy.name}</div>
          <p className="policy-summary">{policy.summary}</p>
        </div>

        {isExpanded && (
          <div className="policy-details">
            <h4 className="policy-details-title">If your guest cancels:</h4>
            <ul className="policy-rules-list">
              {policy.rules.map((rule, index) => (
                <li key={`${rule}-${index}`}>{rule}</li>
              ))}
            </ul>
            {policy.important && (
              <p className="policy-important">
                <strong>Important:</strong> {policy.important}
              </p>
            )}
          </div>
        )}

        <button className="policy-toggle-button" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "Hide details" : "View details"}
        </button>
      </div>
    </div>
  );
};

ListingCancellationPolicy.propTypes = {
  policyId: PropTypes.string,
};

export default ListingCancellationPolicy;
