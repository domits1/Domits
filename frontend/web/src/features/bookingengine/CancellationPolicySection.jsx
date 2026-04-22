import React, { useState } from "react";
import styles from "./CancellationPolicySection.module.scss";

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
            {policy.rules.map((rule, index) => (
              <li key={index}>{rule}</li>
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

export default CancellationPolicySection;
