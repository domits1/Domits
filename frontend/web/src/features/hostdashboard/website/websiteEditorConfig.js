import LaptopMacOutlinedIcon from "@mui/icons-material/LaptopMacOutlined";
import TabletMacOutlinedIcon from "@mui/icons-material/TabletMacOutlined";
import SmartphoneOutlinedIcon from "@mui/icons-material/SmartphoneOutlined";
import { MAX_WEBSITE_CONFIGURABLE_AMENITIES } from "./config/websiteAmenitiesConfig";
import { WEBSITE_HERO_CONTENT_ALIGNMENT_OPTIONS } from "./config/websiteHeroSectionConfig";

export const PREVIEW_VIEWPORT_OPTIONS = Object.freeze([
  { id: "desktop", label: "Desktop", Icon: LaptopMacOutlinedIcon },
  { id: "tablet", label: "Tablet", Icon: TabletMacOutlinedIcon },
  { id: "mobile", label: "Mobile", Icon: SmartphoneOutlinedIcon },
]);

const PANORAMA_TEMPLATE_KEY = "panorama-landing";
const TRUST_SIGNALS_TEMPLATE_KEY = "trust-signals";
const EXPERIENCE_JOURNEY_TEMPLATE_KEY = "experience-journey";
const WHATSAPP_WIDGET_DESCRIPTION =
  "Shows the floating WhatsApp chat launcher when the host has WhatsApp connected.";

const createTextField = (key, label, component = "input") => ({
  key,
  label,
  component,
});

const createToggleField = (key, label, description) => ({
  key,
  label,
  description,
});

const createVisibilityField = (key, label, description) =>
  createToggleField(key, label, description);

const createImageSlot = ({
  id,
  kind,
  label,
  description,
  index = undefined,
  supportsRotation = true,
}) => ({
  id,
  kind,
  ...(typeof index === "number" ? { index } : {}),
  label,
  description,
  supportsRotation,
});

const createGallerySlots = (count, labelPrefix, descriptionPrefix, idPrefix) =>
  Array.from({ length: count }, (_, index) =>
    createImageSlot({
      id: `${idPrefix}-${index + 1}`,
      kind: "gallery",
      index,
      label: `${labelPrefix} ${index + 1}`,
      description: `${descriptionPrefix} ${index + 1}.`,
    })
  );

const isPanoramaTemplate = (templateKey) =>
  String(templateKey || "").trim() === PANORAMA_TEMPLATE_KEY;

const hasAvailabilityCalendarVisibilityField = (templateKey) =>
  (TEMPLATE_VISIBILITY_FIELD_MAP[String(templateKey || "").trim()] || []).some(
    (field) => field.key === "availabilityCalendar"
  );

const BASE_COMMON_TEXT_FIELDS = Object.freeze([
  createTextField("siteTitle", "Website title"),
  createTextField("heroEyebrow", "Hero eyebrow"),
  createTextField("heroTitle", "Hero title"),
  createTextField("heroDescription", "Hero description", "textarea"),
  createTextField("ctaLabel", "CTA label"),
  createTextField("ctaNote", "CTA note", "textarea"),
]);

const PANORAMA_RESIDENCE_TEXT_FIELDS = Object.freeze([
  createTextField("residenceTitle", "Section title"),
  createTextField("residenceHeadline", "Section headline"),
  createTextField("heroDescription", "Section description", "textarea"),
]);

const PANORAMA_RESIDENCE_TOGGLE_FIELDS = Object.freeze([
  createToggleField(
    "residenceShowPanel",
    "Show residence panel",
    'Toggles the white framed surface behind "The residence" section.'
  ),
]);

const PANORAMA_CONTACT_FIELDS = Object.freeze([
  createTextField("title", "Section title"),
  createTextField("caption", "Section caption"),
  createTextField("description", "Section description", "textarea"),
]);

const CALENDAR_TOGGLE_FIELDS = Object.freeze([
  createToggleField(
    "showPanel",
    "Show calendar panel",
    "Toggles the framed surface behind the availability calendar."
  ),
]);

const CALENDAR_TEXT_FIELDS = Object.freeze([
  createTextField("title", "Section title"),
  createTextField("description", "Section description", "textarea"),
]);

const PANORAMA_AMENITIES_TEXT_FIELDS = Object.freeze([
  createTextField("title", "Section title"),
  createTextField("description", "Section subtitle"),
]);

const PANORAMA_GALLERY_TEXT_FIELDS = Object.freeze([
  createTextField("title", "Section title"),
  createTextField("description", "Section subtitle"),
  createTextField("browseLabel", "Browse button label"),
]);

const PANORAMA_GALLERY_TOGGLE_FIELDS = Object.freeze([
  createToggleField(
    "showPanel",
    "Show gallery panel",
    "Toggles the framed surface behind the gallery section."
  ),
]);

export const EDITOR_SECTION_KEYS = Object.freeze({
  common: "common",
  residence: "residence",
  calendar: "calendar",
  gallery: "gallery",
  amenities: "amenities",
  contact: "contact",
  theme: "theme",
  visibility: "visibility",
  images: "images",
  trustCards: "trustCards",
  journeyStops: "journeyStops",
});

export const EDITOR_TARGET_KEYS = Object.freeze({
  common: {
    siteTitle: "common.siteTitle",
    heroEyebrow: "common.heroEyebrow",
    heroTitle: "common.heroTitle",
    heroDescription: "common.heroDescription",
    heroContentAlignment: "common.heroContentAlignment",
    ctaLabel: "common.ctaLabel",
    ctaNote: "common.ctaNote",
  },
  residence: {
    title: "residence.title",
    headline: "residence.headline",
    description: "residence.description",
    showPanel: "residence.showPanel",
    image: "residence.image",
  },
  calendar: {
    visibility: "calendar.visibility",
    title: "calendar.title",
    description: "calendar.description",
    showPanel: "calendar.showPanel",
  },
  gallery: {
    visibility: "gallery.visibility",
    title: "gallery.title",
    description: "gallery.description",
    browseLabel: "gallery.browseLabel",
    showPanel: "gallery.showPanel",
  },
  amenities: (index) => `amenities.${index}`,
  amenitiesSection: {
    title: "amenities.title",
    description: "amenities.description",
  },
  amenitiesIconColor: "amenities.iconColor",
  contact: {
    title: "contact.title",
    caption: "contact.caption",
    description: "contact.description",
    avatarImage: "contact.avatarImage",
    accentColor: "contact.accentColor",
    backgroundColor: "contact.backgroundColor",
  },
  visibility: (fieldKey) => `visibility.${fieldKey}`,
  images: {
    hero: "images.hero",
    gallery: (index) => `images.gallery.${index}`,
  },
  trustCards: (index) => `trustCards.${index}`,
  journeyStops: (index) => `journeyStops.${index}`,
});

export const getGalleryFieldPreviewTargetId = (fieldKey) => {
  if (fieldKey === "title") {
    return EDITOR_TARGET_KEYS.gallery.title;
  }

  if (fieldKey === "browseLabel") {
    return EDITOR_TARGET_KEYS.gallery.browseLabel;
  }

  return EDITOR_TARGET_KEYS.gallery.description;
};

export const TEMPLATE_VISIBILITY_FIELD_MAP = Object.freeze({
  [PANORAMA_TEMPLATE_KEY]: [
    createVisibilityField("topBar", "Show top bar", "Keep or hide the navigation strip at the top of the page."),
    createVisibilityField(
      "callToAction",
      "Show booking prompt",
      "Controls the booking CTA pill below the hero image."
    ),
    createVisibilityField(
      "trustCards",
      "Show trust cards",
      "Controls the three quick-scan feature cards below the hero."
    ),
    createVisibilityField(
      "gallerySection",
      "Show gallery section",
      "Controls the imported photo strip in the lower content block."
    ),
    createVisibilityField(
      "amenitiesPanel",
      "Show amenities panel",
      "Controls the featured amenities panel in the lower content block."
    ),
    createVisibilityField(
      "availabilityCalendar",
      "Show availability calendar",
      "Controls the imported availability snapshot section."
    ),
    createVisibilityField(
      "contactSection",
      "Show contact footer",
      "Controls the contact footer section at the bottom of the page."
    ),
    createVisibilityField("chatWidget", "Show WhatsApp widget", WHATSAPP_WIDGET_DESCRIPTION),
  ],
  [TRUST_SIGNALS_TEMPLATE_KEY]: [
    createVisibilityField("topBar", "Show top bar", "Keep or hide the compact website bar at the top."),
    createVisibilityField(
      "trustCards",
      "Show reassurance cards",
      "Controls the stacked trust cards under the hero image."
    ),
    createVisibilityField(
      "callToAction",
      "Show soft CTA",
      "Controls the soft callout at the bottom of the page."
    ),
    createVisibilityField(
      "availabilityCalendar",
      "Show availability calendar",
      "Controls the imported availability snapshot section."
    ),
    createVisibilityField("chatWidget", "Show WhatsApp widget", WHATSAPP_WIDGET_DESCRIPTION),
  ],
  [EXPERIENCE_JOURNEY_TEMPLATE_KEY]: [
    createVisibilityField("topBar", "Show top bar", "Keep or hide the navigation strip at the top of the page."),
    createVisibilityField(
      "journeyStops",
      "Show journey sections",
      "Controls the arrival, stay, and area narrative blocks."
    ),
    createVisibilityField(
      "amenitiesPanel",
      "Show amenities recap",
      "Controls the featured amenities list in the footer block."
    ),
    createVisibilityField(
      "callToAction",
      "Show next-step callout",
      "Controls the CTA callout in the footer block."
    ),
    createVisibilityField(
      "availabilityCalendar",
      "Show availability calendar",
      "Controls the imported availability snapshot section."
    ),
    createVisibilityField("chatWidget", "Show WhatsApp widget", WHATSAPP_WIDGET_DESCRIPTION),
  ],
});

export const TEMPLATE_IMAGE_SLOT_MAP = Object.freeze({
  [PANORAMA_TEMPLATE_KEY]: [
    createImageSlot({
      id: "panorama-hero",
      kind: "hero",
      label: "Hero image",
      description: "Main visual used in the top hero section.",
    }),
    createImageSlot({
      id: "panorama-residence",
      kind: "residence",
      label: "Residence image",
      description: 'Lead image shown first in the rotating "The residence" section gallery.',
    }),
    ...createGallerySlots(6, "Gallery slot", "Image shown in the Panorama gallery grid slot", "panorama-gallery"),
  ],
  [TRUST_SIGNALS_TEMPLATE_KEY]: [
    createImageSlot({
      id: "trust-hero",
      kind: "hero",
      label: "Hero image",
      description: "Main image used in the trust-oriented layout.",
    }),
  ],
  [EXPERIENCE_JOURNEY_TEMPLATE_KEY]: [
    createImageSlot({
      id: "journey-gallery-arrival",
      kind: "gallery",
      index: 0,
      label: "Journey image 1",
      description: "Visual used next to the first journey stop.",
    }),
    createImageSlot({
      id: "journey-gallery-stay",
      kind: "gallery",
      index: 1,
      label: "Journey image 2",
      description: "Visual used next to the second journey stop.",
    }),
    createImageSlot({
      id: "journey-gallery-surroundings",
      kind: "gallery",
      index: 2,
      label: "Journey image 3",
      description: "Visual used next to the third journey stop.",
    }),
  ],
});

export const TEMPLATE_COPY_COLLECTION_CONFIG = Object.freeze({
  "panorama-landing": {
    trustCards: {
      title: "Quick-scan cards",
      description: "These cards drive the fast-scan content block directly below the hero.",
      itemLabel: "Card",
      count: 3,
      supportsIconSelection: true,
    },
    amenities: {
      title: "Amenities",
      description:
        "Choose which amenities appear first on the website. The first items lead the amenities section and the full list.",
      itemLabel: "Amenity",
      maxCount: MAX_WEBSITE_CONFIGURABLE_AMENITIES,
      supportsIconSelection: true,
      placement: "afterTrustCards",
    },
  },
  "trust-signals": {
    trustCards: {
      title: "Trust cards",
      description: "These cards control the reassurance stack in the trust layout.",
      itemLabel: "Card",
      count: 2,
      supportsIconSelection: true,
    },
  },
  "experience-journey": {
    journeyStops: {
      title: "Journey sections",
      description: "These stops control the step-by-step narrative in the experience layout.",
      itemLabel: "Stop",
      count: 3,
    },
    amenities: {
      title: "Amenities",
      description:
        "Choose which amenities appear first in the footer recap. The first items lead the visible list.",
      itemLabel: "Amenity",
      maxCount: MAX_WEBSITE_CONFIGURABLE_AMENITIES,
      supportsIconSelection: true,
      placement: "afterJourneyStops",
    },
  },
});

export const LOADING_EDITOR_SECTIONS = Object.freeze([
  {
    id: EDITOR_SECTION_KEYS.common,
    title: "Hero",
    description: "Loading the top-of-page copy, hero image controls, and layout settings.",
  },
  {
    id: EDITOR_SECTION_KEYS.visibility,
    title: "Section visibility",
    description: "Loading which website sections can be toggled on or off.",
  },
  {
    id: EDITOR_SECTION_KEYS.theme,
    title: "Theme",
    description: "Loading direct booking website theme selections.",
  },
  {
    id: EDITOR_SECTION_KEYS.images,
    title: "Image slots",
    description: "Loading imported listing photos and template image slot mappings.",
  },
  {
    id: EDITOR_SECTION_KEYS.calendar,
    title: "Calendar",
    description: "Loading calendar visibility and panel settings.",
  },
  {
    id: EDITOR_SECTION_KEYS.gallery,
    title: "Gallery",
    description: "Loading gallery visibility, copy, and image-slot controls.",
  },
]);

export const getCommonTextFields = (templateKey) => {
  if (templateKey === "panorama-landing") {
    return BASE_COMMON_TEXT_FIELDS.filter((field) => field.key !== "heroDescription");
  }

  return BASE_COMMON_TEXT_FIELDS;
};

export const getHeroAlignmentOptions = (templateKey) => {
  if (isPanoramaTemplate(templateKey)) {
    return WEBSITE_HERO_CONTENT_ALIGNMENT_OPTIONS;
  }

  return [];
};

export const getResidenceTextFields = (templateKey) => {
  if (isPanoramaTemplate(templateKey)) {
    return PANORAMA_RESIDENCE_TEXT_FIELDS;
  }

  return [];
};

export const getResidenceToggleFields = (templateKey) => {
  if (isPanoramaTemplate(templateKey)) {
    return PANORAMA_RESIDENCE_TOGGLE_FIELDS;
  }

  return [];
};

export const getCalendarToggleFields = (templateKey) => {
  if (hasAvailabilityCalendarVisibilityField(templateKey)) {
    return CALENDAR_TOGGLE_FIELDS;
  }

  return [];
};

export const getCalendarTextFields = (templateKey) => {
  if (hasAvailabilityCalendarVisibilityField(templateKey)) {
    return CALENDAR_TEXT_FIELDS;
  }

  return [];
};

export const getAmenitiesTextFields = (templateKey) => {
  if (isPanoramaTemplate(templateKey)) {
    return PANORAMA_AMENITIES_TEXT_FIELDS;
  }

  return [];
};

export const getGalleryTextFields = (templateKey) => {
  if (isPanoramaTemplate(templateKey)) {
    return PANORAMA_GALLERY_TEXT_FIELDS;
  }

  return [];
};

export const getGalleryToggleFields = (templateKey) => {
  if (isPanoramaTemplate(templateKey)) {
    return PANORAMA_GALLERY_TOGGLE_FIELDS;
  }

  return [];
};

export const getContactSectionFields = (templateKey) => {
  if (isPanoramaTemplate(templateKey)) {
    return PANORAMA_CONTACT_FIELDS;
  }

  return [];
};

export const getCollectionTargetId = (collectionKey, itemIndex) => {
  if (collectionKey === EDITOR_SECTION_KEYS.amenities) {
    return EDITOR_TARGET_KEYS.amenities(itemIndex);
  }

  if (collectionKey === EDITOR_SECTION_KEYS.trustCards) {
    return EDITOR_TARGET_KEYS.trustCards(itemIndex);
  }

  if (collectionKey === EDITOR_SECTION_KEYS.journeyStops) {
    return EDITOR_TARGET_KEYS.journeyStops(itemIndex);
  }

  return "";
};

export const getImageSlotTargetId = (slot) => {
  if (slot.kind === "hero") {
    return EDITOR_TARGET_KEYS.images.hero;
  }

  if (slot.kind === "residence") {
    return EDITOR_TARGET_KEYS.residence.image;
  }

  return EDITOR_TARGET_KEYS.images.gallery(slot.index);
};
