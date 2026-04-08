import React, { useState } from "react";
import PropTypes from "prop-types";

export const CANCELLATION_POLICIES = [
  {
    id: "flexible",
    name: "Flexible",
    summary: "Full refund until 1 day before check-in",
    rules: [
      "At least 1 day before check-in, they will receive 100% refund ( you will keep 0% of the booking)",
      "Less than 1 day before check-in, they will receive no refund ( you will keep 100% of the booking)",
    ],
    important:
      "your payout is processed once the booking becomes non-refundable (within 24 hours of check-in). You should receive your payout within 3 days of processing.",
  },
  {
    id: "moderate",
    name: "Moderate",
    summary: "Full refund until 5 days before check-in",
    rules: [
      "At least 5 days before check-in, they will receive 100% refund (you will keep 0% of the booking)",
      "Less than 5 days before check-in, they will receive a 50% refund (you will keep 50% of the booking)",
    ],
    important: null,
  },
  {
    id: "strict",
    name: "Strict",
    summary: "Full refund until 30 days before check-in",
    rules: [
      "At least 30 days before check-in, they will receive a 70% refund (you will keep 30% of the booking)",
      "Less than 30 days before check-in, they will receive no refund ( you will keep 100% of the booking)",
    ],
    important: null,
  },
  {
    id: "firm",
    name: "Firm",
    summary: "Full refund until 30 days before check-in",
    rules: [
      "At least 30 days before check-in, they will receive a 100% refund (you will keep 0% of the booking)",
      "Less than 30 days but more than 7 days before check-in, they will receive a 50% refund (you will keep 50% of the booking)",
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

const HOUSE_RULE_KEYS = {
  SuitableForChildren: "Children allowed",
  SuitableForInfants: "Infants allowed",
  PetsAllowed: "Pets allowed",
  SmokingAllowed: "Smoking allowed",
  "Parties/EventsAllowed": "Parties / Events allowed",
};
export const parseHouseRules = (rules = [], property = {}) => {
  const parsed = [];
  Object.entries(HOUSE_RULE_KEYS).forEach(([key, label]) => {
    const value = rules.find((r) => r.rule === key)?.value ?? property[key];
    if (value !== false) parsed.push(label);
  });
  return parsed;
};

const PROPERTY_RULE_KEYS = {
  CookingAllowed: "Cooking allowed",
  ParkingAvailable: "Parking available",
};
export const parsePropertyRules = (rules = [], property = {}) => {
  const parsed = [];
  Object.entries(PROPERTY_RULE_KEYS).forEach(([key, label]) => {
    const value = rules.find((r) => r.rule === key)?.value ?? property[key];
    if (value !== false) parsed.push(label);
  });
  return parsed;
};

export const parseSafetyFeatures = (rules = [], property = {}) => {
  const parsed = ["Smoke detector", "Carbon monoxide detector", "Fire extinguisher", "First aid kit"];
  return parsed.filter((label) => {
    return true;
  });
};

export const parseCheckInOut = (checkInData = {}) => {
  const checkIn = checkInData.checkIn || {};
  const checkOut = checkInData.checkOut || {};
  return {
    checkInFrom: checkIn.from || "15:00",
    checkInTill: checkIn.till || checkIn.from,
    checkOutFrom: checkOut.from || "11:00",
    checkOutTill: checkOut.till || checkOut.from,
    lateCheckIn: Boolean(checkIn.till && checkIn.till !== checkIn.from),
    lateCheckOut: Boolean(checkOut.till && checkOut.till !== checkOut.from),
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
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <ul style={{ paddingLeft: "1.5rem" }}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
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
