import LaptopMacOutlinedIcon from "@mui/icons-material/LaptopMacOutlined";
import TabletMacOutlinedIcon from "@mui/icons-material/TabletMacOutlined";
import SmartphoneOutlinedIcon from "@mui/icons-material/SmartphoneOutlined";
import { MAX_WEBSITE_CONFIGURABLE_AMENITIES } from "./rendering/websiteAmenitiesConfig";

export const PREVIEW_VIEWPORT_OPTIONS = Object.freeze([
  { id: "desktop", label: "Desktop", Icon: LaptopMacOutlinedIcon },
  { id: "tablet", label: "Tablet", Icon: TabletMacOutlinedIcon },
  { id: "mobile", label: "Mobile", Icon: SmartphoneOutlinedIcon },
]);

const BASE_COMMON_TEXT_FIELDS = Object.freeze([
  { key: "siteTitle", label: "Website title", component: "input" },
  { key: "heroEyebrow", label: "Hero eyebrow", component: "input" },
  { key: "heroTitle", label: "Hero title", component: "input" },
  { key: "heroDescription", label: "Hero description", component: "textarea" },
  { key: "ctaLabel", label: "CTA label", component: "input" },
  { key: "ctaNote", label: "CTA note", component: "textarea" },
]);

const PANORAMA_COMMON_TEXT_FIELDS = Object.freeze([
  { key: "residenceTitle", label: "Residence section title", component: "input" },
  { key: "residenceHeadline", label: "Residence section headline", component: "input" },
]);

const PANORAMA_CONTACT_FIELDS = Object.freeze([
  { key: "title", label: "Section title", component: "input" },
  { key: "description", label: "Section description", component: "textarea" },
]);

export const EDITOR_SECTION_KEYS = Object.freeze({
  common: "common",
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
    ctaLabel: "common.ctaLabel",
    ctaNote: "common.ctaNote",
    residenceTitle: "common.residenceTitle",
    residenceHeadline: "common.residenceHeadline",
  },
  amenities: (index) => `amenities.${index}`,
  amenitiesIconColor: "amenities.iconColor",
  contact: {
    title: "contact.title",
    description: "contact.description",
    avatarImage: "contact.avatarImage",
    accentColor: "contact.accentColor",
    backgroundColor: "contact.backgroundColor",
  },
  visibility: (fieldKey) => `visibility.${fieldKey}`,
  images: {
    hero: "images.hero",
    residence: "images.residence",
    gallery: (index) => `images.gallery.${index}`,
  },
  trustCards: (index) => `trustCards.${index}`,
  journeyStops: (index) => `journeyStops.${index}`,
});

export const TEMPLATE_VISIBILITY_FIELD_MAP = Object.freeze({
  "panorama-landing": [
    { key: "topBar", label: "Show top bar", description: "Keep or hide the navigation strip at the top of the page." },
    { key: "callToAction", label: "Show booking prompt", description: "Controls the booking CTA pill below the hero image." },
    { key: "trustCards", label: "Show trust cards", description: "Controls the three quick-scan feature cards below the hero." },
    { key: "gallerySection", label: "Show gallery section", description: "Controls the imported photo strip in the lower content block." },
    { key: "amenitiesPanel", label: "Show amenities panel", description: "Controls the featured amenities panel in the lower content block." },
    { key: "availabilityCalendar", label: "Show availability calendar", description: "Controls the imported availability snapshot section." },
    { key: "contactSection", label: "Show contact footer", description: "Controls the contact footer section at the bottom of the page." },
    { key: "chatWidget", label: "Show chat widget", description: "Shows the visitor contact widget on the website." },
  ],
  "trust-signals": [
    { key: "topBar", label: "Show top bar", description: "Keep or hide the compact website bar at the top." },
    { key: "trustCards", label: "Show reassurance cards", description: "Controls the stacked trust cards under the hero image." },
    { key: "callToAction", label: "Show soft CTA", description: "Controls the soft callout at the bottom of the page." },
    { key: "availabilityCalendar", label: "Show availability calendar", description: "Controls the imported availability snapshot section." },
    { key: "chatWidget", label: "Show chat widget", description: "Shows the visitor contact widget on the website." },
  ],
  "experience-journey": [
    { key: "topBar", label: "Show top bar", description: "Keep or hide the navigation strip at the top of the page." },
    { key: "journeyStops", label: "Show journey sections", description: "Controls the arrival, stay, and area narrative blocks." },
    { key: "amenitiesPanel", label: "Show amenities recap", description: "Controls the featured amenities list in the footer block." },
    { key: "callToAction", label: "Show next-step callout", description: "Controls the CTA callout in the footer block." },
    { key: "availabilityCalendar", label: "Show availability calendar", description: "Controls the imported availability snapshot section." },
    { key: "chatWidget", label: "Show chat widget", description: "Shows the visitor contact widget on the website." },
  ],
});

export const TEMPLATE_IMAGE_SLOT_MAP = Object.freeze({
  "panorama-landing": [
    {
      id: "panorama-hero",
      kind: "hero",
      label: "Hero image",
      description: "Main visual used in the top hero section.",
      supportsRotation: true,
    },
    {
      id: "panorama-residence",
      kind: "residence",
      label: "Residence image",
      description: 'Lead image shown first in the rotating "The residence" section gallery.',
      supportsRotation: true,
    },
    {
      id: "panorama-gallery-primary",
      kind: "gallery",
      index: 0,
      label: "Gallery slot 1",
      description: "First image in the lower gallery strip.",
      supportsRotation: true,
    },
    {
      id: "panorama-gallery-secondary",
      kind: "gallery",
      index: 1,
      label: "Gallery slot 2",
      description: "Second image in the lower gallery strip.",
      supportsRotation: true,
    },
    {
      id: "panorama-gallery-tertiary",
      kind: "gallery",
      index: 2,
      label: "Gallery slot 3",
      description: "Third image in the lower gallery strip.",
      supportsRotation: true,
    },
  ],
  "trust-signals": [
    {
      id: "trust-hero",
      kind: "hero",
      label: "Hero image",
      description: "Main image used in the trust-oriented layout.",
      supportsRotation: true,
    },
  ],
  "experience-journey": [
    {
      id: "journey-gallery-arrival",
      kind: "gallery",
      index: 0,
      label: "Journey image 1",
      description: "Visual used next to the first journey stop.",
      supportsRotation: true,
    },
    {
      id: "journey-gallery-stay",
      kind: "gallery",
      index: 1,
      label: "Journey image 2",
      description: "Visual used next to the second journey stop.",
      supportsRotation: true,
    },
    {
      id: "journey-gallery-surroundings",
      kind: "gallery",
      index: 2,
      label: "Journey image 3",
      description: "Visual used next to the third journey stop.",
      supportsRotation: true,
    },
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
    title: "Common content",
    description: "Loading imported text fields and template copy bindings.",
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
]);

export const getCommonTextFields = (templateKey) => {
  if (templateKey === "panorama-landing") {
    return [...BASE_COMMON_TEXT_FIELDS, ...PANORAMA_COMMON_TEXT_FIELDS];
  }

  return BASE_COMMON_TEXT_FIELDS;
};

export const getContactSectionFields = (templateKey) => {
  if (templateKey === "panorama-landing") {
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
    return EDITOR_TARGET_KEYS.images.residence;
  }

  return EDITOR_TARGET_KEYS.images.gallery(slot.index);
};
