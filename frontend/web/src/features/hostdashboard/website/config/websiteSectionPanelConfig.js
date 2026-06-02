export const DEFAULT_WEBSITE_SECTION_PANEL_COLOR = "#ffffff";

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

export const resolveWebsiteSectionPanelColor = (
  value,
  fallbackColor = DEFAULT_WEBSITE_SECTION_PANEL_COLOR
) => {
  const normalizedValue = normalizeHexColor(value);
  if (HEX_COLOR_PATTERN.test(normalizedValue)) {
    return expandShorthandHexColor(normalizedValue);
  }

  return expandShorthandHexColor(normalizeHexColor(fallbackColor));
};

export const normalizeWebsiteSectionPanelColorOverride = (value) => {
  const normalizedValue = normalizeHexColor(value);
  if (HEX_COLOR_PATTERN.test(normalizedValue)) {
    return expandShorthandHexColor(normalizedValue);
  }

  return "";
};
