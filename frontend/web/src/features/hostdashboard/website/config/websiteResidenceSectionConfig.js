export const DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR = "#ffffff";

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

export const resolveWebsiteResidencePanelColor = (value) => {
  const normalizedValue = normalizeHexColor(value);
  if (HEX_COLOR_PATTERN.test(normalizedValue)) {
    return expandShorthandHexColor(normalizedValue);
  }

  return DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR;
};
