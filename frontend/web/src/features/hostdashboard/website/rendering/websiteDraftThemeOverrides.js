export const DEFAULT_WEBSITE_BACKGROUND_COLOR = "#f8fbff";

export const WEBSITE_BACKGROUND_COLOR_OPTIONS = Object.freeze([
  { id: "sky", label: "Sky", value: "#f8fbff" },
  { id: "white", label: "White", value: "#ffffff" },
  { id: "mist", label: "Mist", value: "#f3f6f9" },
  { id: "sand", label: "Sand", value: "#fbf7ef" },
  { id: "linen", label: "Linen", value: "#f9f4ef" },
  { id: "sage", label: "Sage", value: "#f3f8f0" },
  { id: "seafoam", label: "Seafoam", value: "#eef8f5" },
  { id: "slate", label: "Slate", value: "#eef3f8" },
]);

const MANAGED_THEME_OVERRIDE_KEYS = Object.freeze(["backgroundColor"]);
const WEBSITE_BACKGROUND_COLOR_SET = new Set(
  WEBSITE_BACKGROUND_COLOR_OPTIONS.map(({ value }) => value.toLowerCase())
);

const normalizeBackgroundColor = (value) => String(value || "").trim().toLowerCase();

export const resolveWebsiteBackgroundColor = (value) => {
  const normalizedValue = normalizeBackgroundColor(value);
  return WEBSITE_BACKGROUND_COLOR_SET.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_WEBSITE_BACKGROUND_COLOR;
};

export const createEmptyWebsiteDraftThemeEditorValues = () => ({
  backgroundColor: DEFAULT_WEBSITE_BACKGROUND_COLOR,
});

export const buildWebsiteDraftThemeEditorValues = (themeOverrides = {}) => ({
  backgroundColor: resolveWebsiteBackgroundColor(themeOverrides?.backgroundColor),
});

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
