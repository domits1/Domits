import React from "react";
import PropTypes from "prop-types";

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
        {rules.map((rule) => (
          <div key={buildRuleKey(rule, ruleCounts)} className="ruleItem">
            <span className="ruleItemIcon">🚫</span>
            <span>{rule}</span>
          </div>
        ))}
      </div>

      {cancellationPolicy && (
        <div className="policyBlock">
          <h3>Cancellation Policy</h3>
          <span className="policyTag">{cancellationPolicy.type}</span>
          <span>{cancellationPolicy.description}</span>
        </div>
      )}
    </div>
  );
}

HouseRules.propTypes = {
  rules: PropTypes.arrayOf(PropTypes.string),
  cancellationPolicy: PropTypes.shape({
    type: PropTypes.string,
    description: PropTypes.string,
  }),
};

HouseRules.defaultProps = {
  rules: [],
  cancellationPolicy: null,
};

export default HouseRules;