import {
  DEFAULT_WEBSITE_SECTION_PANEL_COLOR,
  normalizeWebsiteSectionPanelColorOverride,
  resolveWebsiteSectionPanelColor,
} from "./websiteSectionPanelConfig";

export const DEFAULT_WEBSITE_CALENDAR_PANEL_COLORS = Object.freeze({
  default: DEFAULT_WEBSITE_SECTION_PANEL_COLOR,
  "panorama-landing": "#fbf8f2",
});

export const DEFAULT_WEBSITE_CALENDAR_TITLES = Object.freeze({
  default: "Availability",
  "panorama-landing": "Plan Your Stay",
});

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
  return resolveWebsiteSectionPanelColor(
    value,
    getDefaultWebsiteCalendarPanelColor(templateKey)
  );
};

export { normalizeWebsiteSectionPanelColorOverride as normalizeWebsiteCalendarPanelColorOverride };
