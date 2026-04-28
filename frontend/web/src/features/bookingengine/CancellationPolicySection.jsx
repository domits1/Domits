import React, { useState } from "react";
import PropTypes from "prop-types";
import { CANCELLATION_POLICIES } from "../../utils/policyDisplayUtils";
import styles from "./CancellationPolicySection.module.scss";

const CancellationPolicySection = ({ rules }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!rules || !Array.isArray(rules)) return null;

  const policyRule = rules.find((r) => {
    const ruleName = typeof r === "string" ? r : r?.rule;
    const ruleValue = typeof r === "string" ? true : r?.value;
    return ruleName?.startsWith("CancellationPolicy:") && ruleValue === true;
  });

  if (!policyRule) return null;

  const ruleName = typeof policyRule === "string" ? policyRule : policyRule.rule;
  const policyType = ruleName.replace("CancellationPolicy:", "").toLowerCase();
  const policy = CANCELLATION_POLICIES.find((p) => p.id === policyType);
  if (!policy) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Cancellation Policy</span>
        <span className={`${styles.badge} ${styles[policyType]}`}>{policy.name}</span>
      </div>
      <p className={styles.summary}>{policy.summary}</p>
      {isExpanded && (
        <div className={styles.details}>
          <ul className={styles.rulesList}>
            {policy.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          {policy.important && <p className={styles.important}>{policy.important}</p>}
        </div>
      )}
      <button className={styles.toggleButton} onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? "Hide policy details" : "View policy details"}
      </button>
    </div>
  );
};

CancellationPolicySection.propTypes = {
  rules: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        rule: PropTypes.string,
        value: PropTypes.bool,
      }),
    ])
  ),
};

export default CancellationPolicySection;
