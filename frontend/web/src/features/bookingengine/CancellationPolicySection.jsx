import React, { useState } from "react";
import PropTypes from "prop-types";
import { parseCancellationPolicy, parseCancellationPolicyString } from "../../utils/policyDisplayUtils";
import styles from "./CancellationPolicySection.module.scss";

const CancellationPolicySection = ({ rules, policy }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const resolvedPolicy = policy ? parseCancellationPolicyString(policy) : parseCancellationPolicy(rules || []);
  if (!resolvedPolicy?.id) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Cancellation Policy</span>
        <span className={`${styles.badge} ${styles[resolvedPolicy.id] || ""}`}>{resolvedPolicy.type}</span>
      </div>
      <p className={styles.summary}>{resolvedPolicy.summary}</p>
      {isExpanded && (
        <div className={styles.details}>
          <ul className={styles.rulesList}>
            {(resolvedPolicy.details || []).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          {resolvedPolicy.important && <p className={styles.important}>{resolvedPolicy.important}</p>}
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
  policy: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

export default CancellationPolicySection;
