import React, { useState } from "react";
import PropTypes from "prop-types";

const getRefundString = (pct) => {
  if (pct === 100) {
    return "100% refund.";
  }
  if (pct === 70) {
    return "70% refund.";
  }
  if (pct === 50) {
    return "50% refund.";
  }
  return "No refund.";
};

const generatePolicyRuleStrings = (periodDays, refundPercentages) => {
  const periodStr = periodDays === 1 ? `${periodDays} day` : `${periodDays} days`;
  return refundPercentages.map((pct, index) => {
    const refundStr = getRefundString(pct);
    if (index === 0) {
      return `At least ${periodStr} before check-in, Guests will receive ${refundStr}`;
    }
    return `Less than ${periodStr} before check-in, Guests will receive ${refundStr}`;
  });
};

const generateFlexiblePolicyRules = () => generatePolicyRuleStrings(1, [100, 0]);

const generateModeratePolicyRules = () => generatePolicyRuleStrings(5, [100, 50]);

const generateLimitedPolicyRules = () => [
  "At least 14 days before check-in, Guests will receive 100% refund.",
  "Between 7 and 14 days before check-in, Guests will receive 50% refund.",
  "Less than 7 days before check-in, Guests will receive No refund.",
];

const generateFirmPolicyRules = () => [
  "At least 30 days before check-in, Guests will receive 100% refund.",
  "Between 7 and 30 days before check-in, Guests will receive 50% refund.",
  "Less than 7 days before check-in, Guests will receive No refund.",
];

export const CANCELLATION_POLICIES = [
  {
    id: "flexible",
    name: "Flexible",
    summary: "Full refund until 1 day before check-in",
    rules: generateFlexiblePolicyRules(),
    important:
      "Your payout is processed once the booking becomes non-refundable (within 24 hours of check-in). You should receive your payout within 3 days of processing.",
  },
  {
    id: "moderate",
    name: "Moderate",
    summary: "Full refund until 5 days before check-in",
    rules: generateModeratePolicyRules(),
    important:
      "Your payout is processed once the booking becomes non-refundable (5 days before check-in). You should receive your payout within 3 days of processing.",
  },
  {
    id: "strict",
    name: "Limited",
    summary: "Full refund until 14 days before check-in",
    rules: generateLimitedPolicyRules(),
    important:
      "Your payout is processed once the booking becomes non-refundable (14 days before check-in). You should receive your payout within 3 days of processing.",
  },
  {
    id: "firm",
    name: "Firm",
    summary: "Full refund until 30 days before check-in",
    rules: generateFirmPolicyRules(),
    important:
      "Your payout is processed once the booking becomes non-refundable (30 days before check-in). You should receive your payout within 3 days of processing.",
  },
];

const toNormalizedPolicyId = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "_")
    .replaceAll("-", "_");

const getCancellationPolicyColor = (policyId = "") => {
  const normalizedId = toNormalizedPolicyId(policyId);
  if (normalizedId === "flexible") return "#4CAF50";
  if (normalizedId === "moderate") return "#00BCD4";
  if (normalizedId === "strict" || normalizedId === "firm") return "#FF7043";
  return "#6b7280";
};

const buildCancellationPolicy = (policyId, description = null) => {
  const normalizedId = toNormalizedPolicyId(policyId);
  const policy = CANCELLATION_POLICIES.find((item) => item.id === normalizedId);

  if (!policy) {
    return null;
  }

  return {
    id: normalizedId,
    type: policy.name,
    summary: description || policy.summary,
    details: policy.rules,
    important: policy.important,
    color: getCancellationPolicyColor(normalizedId),
  };
};

export const parseCancellationPolicy = (rules = []) => {
  const activePolicy = (rules || []).find(
    (rule) => rule?.rule?.startsWith("CancellationPolicy:") && rule?.value === true
  );

  if (!activePolicy?.rule) {
    return null;
  }

  return buildCancellationPolicy(activePolicy.rule.replace("CancellationPolicy:", ""));
};

export const getActiveCancellationPolicyId = (rulesOrObject = []) => {
  if (Array.isArray(rulesOrObject)) {
    const activePolicy = rulesOrObject.find(
      (rule) => rule?.rule?.startsWith("CancellationPolicy:") && rule?.value === true
    );

    return activePolicy?.rule ? activePolicy.rule.replace("CancellationPolicy:", "") : "";
  }

  if (rulesOrObject && typeof rulesOrObject === "object") {
    const activePolicyKey = Object.keys(rulesOrObject).find(
      (key) => key?.startsWith("CancellationPolicy:") && rulesOrObject[key] === true
    );

    return activePolicyKey ? activePolicyKey.replace("CancellationPolicy:", "") : "";
  }

  return "";
};

export const parseCancellationPolicyString = (policyInput = "") => {
  const policyId =
    typeof policyInput === "string"
      ? policyInput
      : policyInput?.policy_type ||
        policyInput?.policyType ||
        policyInput?.policy ||
        policyInput?.type ||
        policyInput?.id ||
        policyInput?.name ||
        "";

  const description =
    typeof policyInput === "object" && policyInput !== null
      ? policyInput?.description || policyInput?.summary || policyInput?.label || null
      : null;

  const parsed = buildCancellationPolicy(policyId, description);
  if (parsed) {
    return parsed;
  }

  return {
    id: null,
    type: "Not specified",
    summary: description || "No cancellation policy selected.",
    details: [],
    important: null,
    color: getCancellationPolicyColor(),
  };
};

const RULE_KEY_MAPS = {
  house: {
    ChildrenAllowed: { label: "Children allowed", aliases: ["ChildrenAllowed", "SuitableForChildren"] },
    SuitableForInfants: { label: "Infants allowed", aliases: ["SuitableForInfants", "InfantsAllowed"] },
    PetsAllowed: { label: "Pets allowed", aliases: ["PetsAllowed"] },
    SmokingAllowed: { label: "Smoking allowed", aliases: ["SmokingAllowed"] },
    EventsAllowed: {
      label: "Parties / Events allowed",
      aliases: ["EventsAllowed", "PartiesAllowed", "Parties/EventsAllowed"],
    },
    QuietHours: { label: "Quiet hours enforced", aliases: ["QuietHours"] },
    MaxGuests: { label: "Max guests limit", aliases: ["MaxGuests"] },
  },
  property: {
    CookingAllowed: { label: "Cooking allowed", aliases: ["CookingAllowed", "cookingAllowed"] },
    ParkingAvailable: { label: "Parking available", aliases: ["ParkingAvailable", "parkingAvailable"] },
  },
  safety: {
    SmokeDetector: { label: "Smoke detector", aliases: ["SmokeDetector", "smokeDetector"] },
    CarbonMonoxideDetector: {
      label: "Carbon monoxide detector",
      aliases: ["CarbonMonoxideDetector", "CarbonMonoxide", "carbonMonoxideDetector", "carbonMonoxide"],
    },
    FireExtinguisher: { label: "Fire extinguisher", aliases: ["FireExtinguisher", "fireExtinguisher"] },
    FirstAidKit: { label: "First aid kit", aliases: ["FirstAidKit", "firstAidKit"] },
  },
};

const toPolicyRuleObject = (rulesOrObject = []) => {
  if (Array.isArray(rulesOrObject)) {
    return rulesOrObject.reduce((acc, rule) => {
      if (rule?.rule) {
        acc[rule.rule] = rule.value;
      }
      return acc;
    }, {});
  }

  if (rulesOrObject && typeof rulesOrObject === "object") {
    return rulesOrObject;
  }

  return {};
};

const CHECK_IN_OUT_KEY_MAP = {
  CheckInTime: ["CheckInTime", "checkInTime"],
  CheckOutTime: ["CheckOutTime", "checkOutTime"],
  LateCheckInTime: ["LateCheckInTime", "lateCheckInTime"],
  LateCheckOutTime: ["LateCheckOutTime", "lateCheckOutTime"],
};

const getFirstDefinedValue = (source = {}, aliases = []) =>
  aliases.reduce((foundValue, alias) => {
    if (foundValue === undefined) {
      return source?.[alias];
    }

    return foundValue;
  }, undefined);

const formatPolicyTimeValue = (value) => (typeof value === "string" ? value?.slice(0, 5) : value);

const parseGenericRules = (rulesOrObject = [], property = {}, keyMap = {}) => {
  const parsed = [];
  const normalizedRules = toPolicyRuleObject(rulesOrObject);

  Object.values(keyMap).forEach((config) => {
    const aliases = Array.isArray(config?.aliases) && config.aliases.length > 0 ? config.aliases : [];
    const label = config?.label || "";
    const valueFromRules = getFirstDefinedValue(normalizedRules, aliases);
    const valueFromProperty = getFirstDefinedValue(property, aliases);
    const value = valueFromRules ?? valueFromProperty;

    if (value === null || value === undefined) {
      return;
    }

    parsed.push({ label, value });
  });

  return parsed;
};

export const parseHouseRules = (rulesOrObject = [], property = {}) =>
  parseGenericRules(rulesOrObject, property, RULE_KEY_MAPS.house);
export const parsePropertyRules = (rulesOrObject = [], property = {}) =>
  parseGenericRules(rulesOrObject, property, RULE_KEY_MAPS.property);
export const parseSafetyFeatures = (rulesOrObject = [], property = {}) =>
  parseGenericRules(rulesOrObject, property, RULE_KEY_MAPS.safety);

export const parseCheckInOut = (checkInData = {}, rulesOrObject = []) => {
  const normalizedRules = toPolicyRuleObject(rulesOrObject);
  const checkIn = checkInData?.checkIn || {};
  const checkOut = checkInData?.checkOut || {};
  const checkInFrom =
    formatPolicyTimeValue(getFirstDefinedValue(checkInData, CHECK_IN_OUT_KEY_MAP.CheckInTime)) ||
    formatPolicyTimeValue(typeof checkIn?.from === "string" ? checkIn.from : undefined) ||
    "15:00";
  const checkInTill =
    formatPolicyTimeValue(getFirstDefinedValue(checkInData, CHECK_IN_OUT_KEY_MAP.LateCheckInTime)) ||
    formatPolicyTimeValue(typeof checkIn?.till === "string" ? checkIn.till : undefined) ||
    checkInFrom;
  const checkOutFrom =
    formatPolicyTimeValue(getFirstDefinedValue(checkInData, CHECK_IN_OUT_KEY_MAP.CheckOutTime)) ||
    formatPolicyTimeValue(typeof checkOut?.from === "string" ? checkOut.from : undefined) ||
    "11:00";
  const checkOutTill =
    formatPolicyTimeValue(getFirstDefinedValue(checkInData, CHECK_IN_OUT_KEY_MAP.LateCheckOutTime)) ||
    formatPolicyTimeValue(typeof checkOut?.till === "string" ? checkOut.till : undefined) ||
    checkOutFrom;

  return {
    checkInFrom,
    checkInTill,
    checkOutFrom,
    checkOutTill,
    lateCheckinEnabled: normalizedRules.LateCheckinEnabled === true,
    lateCheckIn: Boolean(checkInTill && checkInTill !== checkInFrom),
    lateCheckOut: Boolean(checkOutTill && checkOutTill !== checkOutFrom),
  };
};

const getItemLabel = (item) => {
  if (typeof item !== "string") {
    const label = item?.label || "";
    if (typeof item?.value === "boolean") {
      return item.value ? label : `No ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
    }

    if (typeof item?.value === "string" && item.value.trim()) {
      return `${label}: ${item.value}`;
    }

    return label;
  }

  return item;
};

const getItemIcon = (item) => {
  if (typeof item !== "string") {
    if (typeof item?.value === "boolean") {
      return item.value ? (
        <span className="listing-policy-icon listing-policy-icon--positive" aria-hidden="true">
          ✓
        </span>
      ) : (
        <span className="listing-policy-icon listing-policy-icon--negative" aria-hidden="true">
          ✗
        </span>
      );
    }

    return (
      <span className="listing-policy-icon listing-policy-icon--neutral" aria-hidden="true">
        •
      </span>
    );
  }

  return null;
};

const getPolicyMetadata = (items = [], expandable = false) => {
  if (!expandable || typeof items[0] !== "object") {
    return null;
  }

  return items[0];
};

const getPolicyListItems = (items = [], expandable = false) => (expandable ? items.slice(1) : items);

const getVisiblePolicyItems = (listItems = [], expandable = false, expanded = false) => {
  if (!expandable || expanded) {
    return listItems;
  }

  return listItems.slice(0, 3);
};

const renderPolicyList = (title, items = []) => (
  <ul className="listing-policy-section-list">
    {items.map((item, index) => (
      <li key={`${title}-${index}`} className="listing-policy-section-list-item">
        {getItemIcon(item)}
        <span>{getItemLabel(item)}</span>
      </li>
    ))}
  </ul>
);

const renderPolicyBadge = (badge) => {
  if (!badge) {
    return null;
  }

  return (
    <span className="listing-policy-badge" style={{ backgroundColor: badge.color || "#6b7280" }}>
      {badge.label}
    </span>
  );
};

const renderExpandableSection = (title, visibleItems, shouldShowToggle, expanded, setExpanded) => (
  <>
    {shouldShowToggle ? (
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="listing-policy-details-button">
        {expanded ? "Show less" : "Show more"}
      </button>
    ) : null}
    {renderPolicyList(title, visibleItems)}
  </>
);

export const PolicySection = ({ title, items = [], expandable = false, className = "" }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;

  const metadata = getPolicyMetadata(items, expandable);
  const listItems = getPolicyListItems(items, expandable);
  const visibleItems = getVisiblePolicyItems(listItems, expandable, expanded);
  const shouldShowToggle = expandable && listItems.length > 3;
  let sectionContent = renderPolicyList(title, listItems);

  if (expandable) {
    sectionContent = renderExpandableSection(title, visibleItems, shouldShowToggle, expanded, setExpanded);
  }

  return (
    <section className={`policy-section listing-policy-section ${className}`}>
      <div className="listing-policy-section-header">
        <h4 className="listing-policy-section-title">{title}</h4>
        {renderPolicyBadge(metadata?.badge)}
      </div>

      {metadata?.summary ? <p className="listing-policy-summary">{metadata.summary}</p> : null}

      {sectionContent}
    </section>
  );
};

PolicySection.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array,
  expandable: PropTypes.bool,
  className: PropTypes.string,
};
