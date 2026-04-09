import React from "react";
import PropTypes from "prop-types";
import { PolicySection } from "../../../utils/policyDisplayUtils.js";

const buildRuleKey = (() => {
  const separator = "::";

  return (rule, counts) => {
    const nextCount = (counts.get(rule) || 0) + 1;
    counts.set(rule, nextCount);
    return `${rule}${separator}${nextCount}`;
  };
})();

function HouseRules({ rules, cancellationPolicy }) {
  const ruleCounts = new Map();

  return (
    <div className="card">
      <h3>House rules</h3>

      <div className="rulesList">
        {rules.length > 0 ? (
          rules.map((rule) => (
            <div key={buildRuleKey(rule, ruleCounts)} className="ruleItem">
              <span className="ruleItemIcon">-</span>
              <span>{rule}</span>
            </div>
          ))
        ) : (
          <div className="ruleItem">
            <span>No additional house rules have been provided.</span>
          </div>
        )}
      </div>

      {cancellationPolicy ? (
        <div className="policyBlock">
          <h3>Cancellation Policy</h3>
          <PolicySection
            title="Cancellation Policy"
            items={[cancellationPolicy.summary, ...cancellationPolicy.details]}
            expandable={true}
          />
        </div>
      ) : null}
    </div>
  );
}

HouseRules.propTypes = {
  rules: PropTypes.arrayOf(PropTypes.string),
  cancellationPolicy: PropTypes.shape({
    type: PropTypes.string,
    description: PropTypes.string,
    summary: PropTypes.string,
    details: PropTypes.arrayOf(PropTypes.string),
  }),
};

HouseRules.defaultProps = {
  rules: [],
  cancellationPolicy: null,
};

export default HouseRules;
