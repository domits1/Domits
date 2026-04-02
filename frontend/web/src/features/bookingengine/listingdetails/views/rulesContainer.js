import React from "react";
import PropTypes from "prop-types";

const RulesContainer = ({ rules, checkIn }) => {
  const safeRules = Array.isArray(rules) ? rules : [];
  const checkInFrom = checkIn?.checkIn?.from;
  const checkInTill = checkIn?.checkIn?.till;
  const checkOutFrom = checkIn?.checkOut?.from;
  const checkOutTill = checkIn?.checkOut?.till;

  const formatRule = (rule) => {
    const allowedText = rule.value ? "allowed" : "not allowed";

    const parts = rule.rule.split("/").map((part) => {
      const cleaned = part.replace("Allowed", "");
      const words = cleaned.split(/(?=[A-Z])/).join(" ");
      return words.trim();
    });

    const attributes = parts.join(" and ");

    return `${attributes} ${allowedText}`;
  };

  const formatHour = (value) => {
    if (!value) return "";
    const parts = value.toString().split(":");
    const hour = parts[0] || "00";
    const minute = parts[1] || "00";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  };

  const formatTimeRange = (from, till) => {
    const formattedFrom = formatHour(from);
    const formattedTill = formatHour(till);

    if (formattedFrom && formattedTill) {
      return `${formattedFrom} - ${formattedTill}`;
    }

    return formattedFrom || formattedTill;
  };

  const formattedRules = safeRules.map((rule) => formatRule(rule)).join(" - ");
  const formattedCheckInRange = formatTimeRange(checkInFrom, checkInTill);
  const formattedCheckOutRange = formatTimeRange(checkOutFrom, checkOutTill);
  const hasCheckInInfo = Boolean(formattedCheckInRange || formattedCheckOutRange);

  if (!formattedRules && !hasCheckInInfo) {
    return null;
  }

  return (
    <div className="rules-container">
      <p className="rules-title">House rules:</p>
      {formattedRules ? <p className="rules">{formattedRules}</p> : null}
      {hasCheckInInfo ? (
        <div className="rules-check-in-check-out-container">
          {formattedCheckInRange ? <p>Check-in: {formattedCheckInRange}</p> : null}
          {formattedCheckOutRange ? <p>Check-out: {formattedCheckOutRange}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

RulesContainer.propTypes = {
  rules: PropTypes.arrayOf(
    PropTypes.shape({
      rule: PropTypes.string,
      value: PropTypes.bool,
    })
  ),
  checkIn: PropTypes.shape({
    checkIn: PropTypes.shape({
      from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      till: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    checkOut: PropTypes.shape({
      from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      till: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  }),
};

export default RulesContainer;
