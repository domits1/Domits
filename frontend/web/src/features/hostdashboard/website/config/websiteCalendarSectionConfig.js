export const DEFAULT_WEBSITE_CALENDAR_PANEL_COLORS = Object.freeze({
  default: "#ffffff",
  "panorama-landing": "#fbf8f2",
});

export const DEFAULT_WEBSITE_CALENDAR_TITLES = Object.freeze({
  default: "Availability",
  "panorama-landing": "Plan Your Stay",
});

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const normalizeHexColor = (value) => String(value || "").trim().toLowerCase();
const expandShorthandHexColor = (value) =>
  value.length === 4
    ? `#${value
        .slice(1)
        .split("")
        .map((character) => `${character}${character}`)
        .join("")}`
    : value;

export const getDefaultWebsiteCalendarPanelColor = (templateKey = "") =>
  DEFAULT_WEBSITE_CALENDAR_PANEL_COLORS[String(templateKey || "").trim()] ||
  DEFAULT_WEBSITE_CALENDAR_PANEL_COLORS.default;

export const getDefaultWebsiteCalendarTitle = (templateKey = "") =>
  DEFAULT_WEBSITE_CALENDAR_TITLES[String(templateKey || "").trim()] ||
  DEFAULT_WEBSITE_CALENDAR_TITLES.default;

export const getDefaultWebsiteCalendarDescription = ({
  templateKey = "",
  propertyTitle = "",
  blockedDateCount = 0,
  availabilityCallout = "",
} = {}) => {
  if (String(templateKey || "").trim() === "panorama-landing") {
    const normalizedTitle = String(propertyTitle || "").trim() || "This stay";

    if (Number(blockedDateCount) > 0) {
      return `${normalizedTitle} already has reserved dates across the next two months. Use the calendar below to spot open nights quickly.`;
    }

    return `${normalizedTitle} is currently open across the next two months. Use the calendar below to plan the stay.`;
  }

  const normalizedAvailabilityCallout = String(availabilityCallout || "").trim();
  if (normalizedAvailabilityCallout) {
    return normalizedAvailabilityCallout;
  }

  return "Live quote requests still validate current availability before a guest can continue.";
};

export const resolveWebsiteCalendarPanelColor = (value, templateKey = "") => {
  const normalizedValue = normalizeHexColor(value);
  if (HEX_COLOR_PATTERN.test(normalizedValue)) {
    return expandShorthandHexColor(normalizedValue);
  }

  return getDefaultWebsiteCalendarPanelColor(templateKey);
};

export const normalizeWebsiteCalendarPanelColorOverride = (value) => {
  const normalizedValue = normalizeHexColor(value);
  if (HEX_COLOR_PATTERN.test(normalizedValue)) {
    return expandShorthandHexColor(normalizedValue);
  }

  return "";
};
