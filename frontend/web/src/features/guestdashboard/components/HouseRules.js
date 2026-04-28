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

function HouseRules({ rules = [], cancellationPolicy = null }) {
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
    </div>
  );
}

HouseRules.propTypes = {
  rules: PropTypes.arrayOf(PropTypes.string),
};

HouseRules.defaultProps = {
  rules: [],
};

export default HouseRules;
