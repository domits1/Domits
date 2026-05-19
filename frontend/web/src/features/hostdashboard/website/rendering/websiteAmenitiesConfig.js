export const MAX_WEBSITE_CONFIGURABLE_AMENITIES = 10;
export const MAX_FEATURED_WEBSITE_AMENITIES = 6;
export const WEBSITE_AMENITY_FALLBACK_CATEGORY = "Other";
export const DEFAULT_WEBSITE_AMENITY_LABEL = "New amenity";
export const DEFAULT_WEBSITE_AMENITY_ICON_COLOR = "#c99c53";

const TEMPLATE_AMENITY_ICON_COLOR_DEFAULTS = Object.freeze({
  "panorama-landing": "#c99c53",
  "experience-journey": "#314f22",
});

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeHexColor = (value) => {
  const normalizedValue = String(value || "").trim();
  if (!HEX_COLOR_PATTERN.test(normalizedValue)) {
    return "";
  }

  if (normalizedValue.length === 7) {
    return normalizedValue.toLowerCase();
  }

  const [red, green, blue] = normalizedValue.slice(1).split("");
  return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
};

export const getDefaultWebsiteAmenityIconColor = (templateKey = "") =>
  TEMPLATE_AMENITY_ICON_COLOR_DEFAULTS[String(templateKey || "").trim()] ||
  DEFAULT_WEBSITE_AMENITY_ICON_COLOR;

export const isValidWebsiteAmenityIconColor = (value) => Boolean(normalizeHexColor(value));

export const resolveWebsiteAmenityIconColor = (value, templateKey = "") =>
  normalizeHexColor(value) || getDefaultWebsiteAmenityIconColor(templateKey);
