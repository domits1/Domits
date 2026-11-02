import React, { useState } from "react";
import PropTypes from "prop-types";
import { parseCancellationPolicyString } from "../../../utils/policyDisplayUtils";
import "./ListingCancellationPolicy.css";

const ListingCancellationPolicy = ({ policyId = "flexible" }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const policy = parseCancellationPolicyString(policyId);
  if (!policy?.id) return null;

  return (
    <div className="listing-cancellation-policy">
      <h3 className="policy-section-title">Cancellation Policy</h3>

      <div className="policy-card">
        <div className="policy-header">
          <div className="policy-badge">{policy.type}</div>
          <p className="policy-summary">{policy.summary}</p>
        </div>

        {isExpanded && (
          <div className="policy-details">
            <h4 className="policy-details-title">If your guest cancels:</h4>
            <ul className="policy-rules-list">
              {(policy.details || []).map((rule, index) => (
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
