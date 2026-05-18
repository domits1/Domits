export const DEFAULT_WEBSITE_CONTACT_TITLE = "Plan the stay with the host";
export const DEFAULT_WEBSITE_CONTACT_DESCRIPTION =
  "Questions about the layout, pricing, or availability? Send a message through Domits and the host can reply with the right details before you book.";
export const DEFAULT_WEBSITE_CONTACT_ACCENT_COLOR = "#f5e5cb";
export const DEFAULT_WEBSITE_CONTACT_BACKGROUND_COLOR = "#1b2436";

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

const resolveWebsiteContactHexColor = (value, fallbackColor) => {
  const normalizedValue = normalizeHexColor(value);
  if (HEX_COLOR_PATTERN.test(normalizedValue)) {
    return expandShorthandHexColor(normalizedValue);
  }

  return fallbackColor;
};

export const resolveWebsiteContactAccentColor = (value) =>
  resolveWebsiteContactHexColor(value, DEFAULT_WEBSITE_CONTACT_ACCENT_COLOR);

export const resolveWebsiteContactBackgroundColor = (value) =>
  resolveWebsiteContactHexColor(value, DEFAULT_WEBSITE_CONTACT_BACKGROUND_COLOR);
