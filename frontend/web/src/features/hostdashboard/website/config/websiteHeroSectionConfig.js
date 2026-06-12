export const DEFAULT_WEBSITE_HERO_CONTENT_ALIGNMENT = "center";

export const WEBSITE_HERO_CONTENT_ALIGNMENT_OPTIONS = Object.freeze([
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "center-left", label: "Center left" },
  { value: "center", label: "Center" },
  { value: "center-right", label: "Center right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
]);

const WEBSITE_HERO_CONTENT_ALIGNMENT_VALUES = new Set(
  WEBSITE_HERO_CONTENT_ALIGNMENT_OPTIONS.map((option) => option.value)
);

export const resolveWebsiteHeroContentAlignment = (
  value,
  fallbackValue = DEFAULT_WEBSITE_HERO_CONTENT_ALIGNMENT
) => {
  const normalizedFallbackValue = WEBSITE_HERO_CONTENT_ALIGNMENT_VALUES.has(fallbackValue)
    ? fallbackValue
    : DEFAULT_WEBSITE_HERO_CONTENT_ALIGNMENT;
  const normalizedValue = String(value || "").trim().toLowerCase();

  return WEBSITE_HERO_CONTENT_ALIGNMENT_VALUES.has(normalizedValue)
    ? normalizedValue
    : normalizedFallbackValue;
};
