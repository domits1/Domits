export const DEFAULT_WEBSITE_BACKGROUND_COLOR = "#f8fbff";

export const WEBSITE_BACKGROUND_COLOR_OPTIONS = Object.freeze([
  { id: "sky", label: "Sky", value: "#f8fbff" },
  { id: "white", label: "White", value: "#ffffff" },
  { id: "mist", label: "Mist", value: "#f3f6f9" },
  { id: "cream", label: "Cream", value: "#fff8eb" },
  { id: "linen", label: "Linen", value: "#f9f4ef" },
  { id: "sage", label: "Sage", value: "#f3f8f0" },
  { id: "black", label: "Black", value: "#000000" },
  { id: "slate", label: "Slate", value: "#eef3f8" },
]);

const MANAGED_THEME_OVERRIDE_KEYS = Object.freeze(["backgroundColor"]);
const WEBSITE_BACKGROUND_COLOR_SET = new Set(
  WEBSITE_BACKGROUND_COLOR_OPTIONS.map(({ value }) => value.toLowerCase())
);
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const normalizeBackgroundColor = (value) => String(value || "").trim().toLowerCase();
const expandShorthandHexColor = (value) =>
  value.length === 4
    ? `#${value
        .slice(1)
        .split("")
        .map((character) => `${character}${character}`)
        .join("")}`
    : value;

export const isValidWebsiteBackgroundColor = (value) => {
  const normalizedValue = normalizeBackgroundColor(value);
  return WEBSITE_BACKGROUND_COLOR_SET.has(normalizedValue) || HEX_COLOR_PATTERN.test(normalizedValue);
};

export const resolveWebsiteBackgroundColor = (value) => {
  const normalizedValue = normalizeBackgroundColor(value);
  if (WEBSITE_BACKGROUND_COLOR_SET.has(normalizedValue)) {
    return normalizedValue;
  }

  if (HEX_COLOR_PATTERN.test(normalizedValue)) {
    return expandShorthandHexColor(normalizedValue);
  }

  return DEFAULT_WEBSITE_BACKGROUND_COLOR;
};

export const createEmptyWebsiteDraftThemeEditorValues = () => ({
  backgroundColor: DEFAULT_WEBSITE_BACKGROUND_COLOR,
  backgroundColorInput: DEFAULT_WEBSITE_BACKGROUND_COLOR,
});

export const buildWebsiteDraftThemeEditorValues = (themeOverrides = {}) => {
  const backgroundColor = resolveWebsiteBackgroundColor(themeOverrides?.backgroundColor);

  return {
    backgroundColor,
    backgroundColorInput: backgroundColor,
  };
};

export const applyWebsiteDraftThemeOverrides = (model, themeOverrides = {}) => ({
  ...model,
  theme: {
    ...(model?.theme && typeof model.theme === "object" ? model.theme : {}),
    backgroundColor: resolveWebsiteBackgroundColor(themeOverrides?.backgroundColor),
  },
});

export const buildWebsiteDraftThemeOverridePatch = (themeValues = {}) => {
  const backgroundColor = resolveWebsiteBackgroundColor(themeValues?.backgroundColor);
  if (backgroundColor === DEFAULT_WEBSITE_BACKGROUND_COLOR) {
    return {};
  }

  return {
    backgroundColor,
  };
};

export const mergeWebsiteDraftThemeOverrides = (existingOverrides = {}, nextPatch = {}) => {
  const mergedOverrides = {
    ...existingOverrides,
  };

  MANAGED_THEME_OVERRIDE_KEYS.forEach((overrideKey) => {
    delete mergedOverrides[overrideKey];
  });

  return {
    ...mergedOverrides,
    ...nextPatch,
  };
};
