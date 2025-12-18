import React from "react";

const RulesContainer = ({ rules, checkIn }) => {
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

  const formatHour = (hour) => {
    const padded = hour.toString().padStart(2, "0");
    return `${padded}:00`;
  };

  return (
    <div className="rules-container">
      <p className="rules-title">House rules:</p>
      <p className="rules">
        {rules.map((rule) => formatRule(rule)).join(" - ")}
      </p>
      <div className="rules-check-in-check-out-container">
        <p>Check-in from: {formatHour(checkIn.checkIn.from)} till: {formatHour(checkIn.checkIn.till)}</p>
        <p>Check-out from: {formatHour(checkIn.checkOut.from)} till: {formatHour(checkIn.checkOut.till)}</p>
      </div>
    </div>
  );
};

export default RulesContainer;
