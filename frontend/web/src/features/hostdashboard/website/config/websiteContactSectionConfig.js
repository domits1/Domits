export const DEFAULT_WEBSITE_CONTACT_SECTION_TITLE = "Contact";
export const DEFAULT_WEBSITE_CONTACT_TITLE = "Plan the stay with the host";
export const DEFAULT_WEBSITE_CONTACT_DESCRIPTION =
  "Questions about the layout, pricing, or availability? Send a message through Domits and the host can reply with the right details before you book.";
export const DEFAULT_WEBSITE_CONTACT_ACCENT_COLOR = "#f5e5cb";
export const DEFAULT_WEBSITE_CONTACT_BACKGROUND_COLOR = "#1b2436";
export const WEBSITE_CONTACT_AVATAR_MODE_HOST = "host";
export const WEBSITE_CONTACT_AVATAR_MODE_INITIALS = "initials";
export const WEBSITE_CONTACT_AVATAR_MODE_CUSTOM = "custom";

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

export const resolveWebsiteContactAvatarMode = (
  value,
  fallbackMode = WEBSITE_CONTACT_AVATAR_MODE_HOST
) => {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (
    normalizedValue === WEBSITE_CONTACT_AVATAR_MODE_HOST ||
    normalizedValue === WEBSITE_CONTACT_AVATAR_MODE_INITIALS ||
    normalizedValue === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM
  ) {
    return normalizedValue;
  }

  return fallbackMode;
};

export const resolveWebsiteContactSectionCopy = (contactSection) => {
  const normalizedTitle = String(contactSection?.title || "").trim();
  const normalizedCaption = String(contactSection?.caption || "").trim();

  if (normalizedCaption) {
    return {
      title: normalizedTitle || DEFAULT_WEBSITE_CONTACT_SECTION_TITLE,
      caption: normalizedCaption,
    };
  }

  if (!normalizedTitle) {
    return {
      title: DEFAULT_WEBSITE_CONTACT_SECTION_TITLE,
      caption: DEFAULT_WEBSITE_CONTACT_TITLE,
    };
  }

  if (normalizedTitle.toLowerCase() === DEFAULT_WEBSITE_CONTACT_SECTION_TITLE.toLowerCase()) {
    return {
      title: normalizedTitle,
      caption: DEFAULT_WEBSITE_CONTACT_TITLE,
    };
  }

  return {
    title: DEFAULT_WEBSITE_CONTACT_SECTION_TITLE,
    caption: normalizedTitle,
  };
};
