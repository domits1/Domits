import React, { useState } from "react";
import PropTypes from "prop-types";

const getRefundString = (pct) => {
  if (pct === 100) {
    return "100% refund (you will keep 0% of the booking)";
  }
  if (pct === 70) {
    return "70% refund (you will keep 30% of the booking)";
  }
  if (pct === 50) {
    return "50% refund (you will keep 50% of the booking)";
  }
  return "no refund ( you will keep 100% of the booking)";
};

const generatePolicyRuleStrings = (periodDays, refundPercentages) => {
  const periodStr = periodDays === 1 ? `${periodDays} day` : `${periodDays} days`;
  return refundPercentages.map((pct, index) => {
    const refundStr = getRefundString(pct);
    if (index === 0) {
      return `At least ${periodStr} before check-in, they will receive ${refundStr}`;
    }
    return `Less than ${periodStr} before check-in, they will receive ${refundStr}`;
  });
};

export const CANCELLATION_POLICIES = [
  {
    id: "flexible",
    name: "Flexible",
    summary: "Full refund until 1 day before check-in",
    rules: generatePolicyRuleStrings(1, [100, 0]),
    important:
      "your payout is processed once the booking becomes non-refundable (within 24 hours of check-in). You should receive your payout within 3 days of processing.",
  },
  {
    id: "moderate",
    name: "Moderate",
    summary: "Full refund until 5 days before check-in",
    rules: generatePolicyRuleStrings(5, [100, 50]),
    important: null,
  },
  {
    id: "strict",
    name: "Strict",
    summary: "Full refund until 30 days before check-in",
    rules: generatePolicyRuleStrings(30, [70, 0]),
    important: null,
  },
  {
    id: "firm",
    name: "Firm",
    summary: "Full refund until 30 days before check-in",
    rules: [
      ...generatePolicyRuleStrings(30, [100, 50]),
      "Less than 7 days before check-in, they will receive no refund ( you will keep 100% of the booking)",
    ],
    important: null,
  },
];

export const parseCancellationPolicy = (rules = []) => {
  const activePolicy = rules.find((rule) => rule.rule?.startsWith("CancellationPolicy:") && rule.value === true);
  if (!activePolicy) return null;

  const policyId = activePolicy.rule.replace("CancellationPolicy:", "").toLowerCase();
  const policy = CANCELLATION_POLICIES.find((p) => p.id === policyId);
  return policy
    ? {
        type: policy.name,
        summary: policy.summary,
        details: policy.rules,
        important: policy.important,
      }
    : null;
};

export const parseCancellationPolicyString = (policyString = "") => {
  const policyId = policyString.toLowerCase().trim();
  const policy = CANCELLATION_POLICIES.find((p) => p.id === policyId);
  return policy
    ? {
        type: policy.name,
        summary: policy.summary,
        details: policy.rules,
        important: policy.important,
      }
    : null;
};

const RULE_KEY_MAPS = {
  house: {
    ChildrenAllowed: "Children allowed",
    SuitableForInfants: "Infants allowed",
    PetsAllowed: "Pets allowed",
    SmokingAllowed: "Smoking allowed",
    EventsAllowed: "Parties / Events allowed",
    QuietHours: "Quiet hours enforced",
    MaxGuests: "Max guests limit",
  },
  property: {
    CookingAllowed: "Cooking allowed",
    ParkingAvailable: "Parking available",
  },
  safety: {
    SmokeDetector: "Smoke detector",
    CarbonMonoxideDetector: "Carbon monoxide detector",
    FireExtinguisher: "Fire extinguisher",
    FirstAidKit: "First aid kit",
  },
};

const parseGenericRules = (rules, property, keyMap) => {
  const parsed = [];
  Object.entries(keyMap).forEach(([key, label]) => {
    const value = rules.find((r) => r.rule === key)?.value ?? property[key];
    if (value !== false) parsed.push(label);
  });
  return parsed;
};

export const parseHouseRules = (rules = [], property = {}) => parseGenericRules(rules, property, RULE_KEY_MAPS.house);
export const parsePropertyRules = (rules = [], property = {}) =>
  parseGenericRules(rules, property, RULE_KEY_MAPS.property);
export const parseSafetyFeatures = (rules = [], property = {}) =>
  parseGenericRules(rules, property, RULE_KEY_MAPS.safety);

export const parseCheckInOut = (checkInData = {}) => {
  const checkIn = checkInData.checkIn || {};
  const checkOut = checkInData.checkOut || {};
  const checkInFrom = checkIn.from || "15:00";
  const checkInTill = checkIn.till || checkIn.from;
  const checkOutFrom = checkOut.from || "11:00";
  const checkOutTill = checkOut.till || checkOut.from;
  return {
    checkInFrom,
    checkInTill,
    checkOutFrom,
    checkOutTill,
    lateCheckIn: Boolean(checkInTill && checkInTill !== checkInFrom),
    lateCheckOut: Boolean(checkOutTill && checkOutTill !== checkOutFrom),
  };
};

export const PolicySection = ({ title, items = [], expandable = false, className = "" }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  return (
    <section
      className={`policy-section ${className}`}
      style={{
        marginBottom: "1rem",
        padding: "1rem",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        background: "#f9f9f9",
      }}>
      <h4 style={{ marginBottom: "0.5rem", color: "#0D9813" }}>{title}</h4>
      {expandable ? (
        <>
          <div style={{ marginBottom: "0.5rem" }}>{items[0]}</div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "#0D9813",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}>
            View {expanded ? "less" : "details"}
          </button>
          {expanded && (
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
              {items.slice(1).map((item, i) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <ul style={{ paddingLeft: "1.5rem" }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

PolicySection.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array,
  expandable: PropTypes.bool,
  className: PropTypes.string,
};
