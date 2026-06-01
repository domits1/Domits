const TEMPLATE_BUILDER_ENABLED_OPTIONS = Object.freeze({
  builderEnabled: true,
});

const TEMPLATE_COMING_SOON_OPTIONS = Object.freeze({
  builderEnabled: false,
});

const TEMPLATE_HIDDEN_OPTIONS = Object.freeze({
  hidden: true,
});

const COMING_SOON_TEMPLATE_DEFINITIONS = [
  [
    "trust-signals",
    "Trust Signals",
    "A reassuring landing page with reviews, guest highlights, policy clarity, and a soft booking nudge.",
    "trustSignals",
  ],
  [
    "experience-journey",
    "Experience Journey",
    "A curated flow that walks guests through arrival, stay, surroundings, and next steps.",
    "experienceJourney",
  ],
  [
    "amenities-spotlight",
    "Amenities Spotlight",
    "A feature-led layout that puts standout amenities and property strengths front and center.",
    "amenitiesSpotlight",
  ],
  [
    "gallery-grid",
    "Gallery Grid",
    "Photo-first browsing with a clean grid for guests who compare on visuals.",
    "galleryGrid",
  ],
  [
    "editorial-split",
    "Editorial Split",
    "Story-led content on the left with a visual property showcase on the right.",
    "editorial",
  ],
  [
    "booking-focus",
    "Booking Focus",
    "A booking-led layout with a visible quote panel for guests ready to decide faster.",
    "bookingFocus",
  ],
  [
    "contact-focus",
    "Contact Focus",
    "Balanced content sections with a strong footer action for direct guest contact.",
    "contactFocus",
  ],
  [
    "local-guide",
    "Local Guide",
    "A location-led page that highlights the area, nearby spots, and the context around the stay.",
    "localGuide",
  ],
];

const buildTemplateOption = ([id, name, description, layout, extraOptions = {}]) => ({
  id,
  name,
  description,
  layout,
  ...extraOptions,
});

const buildComingSoonTemplateDefinition = ([id, name, description, layout]) => [
  id,
  name,
  description,
  layout,
  TEMPLATE_COMING_SOON_OPTIONS,
];

const TEMPLATE_DEFINITIONS = [
  [
    "panorama-landing",
    "Panorama Landing",
    "Large hero image with fast trust signals and a guided booking call-to-action.",
    "panorama",
    TEMPLATE_BUILDER_ENABLED_OPTIONS,
  ],
  ...COMING_SOON_TEMPLATE_DEFINITIONS.map(buildComingSoonTemplateDefinition),
  [
    "feature-stack",
    "Feature Stack",
    "A landing page with quick checks, value blocks, and a simple flow down the page.",
    "featureStack",
    TEMPLATE_HIDDEN_OPTIONS,
  ],
];

const WEBSITE_TEMPLATE_CATALOG = TEMPLATE_DEFINITIONS.map(buildTemplateOption);
export const DEFAULT_WEBSITE_TEMPLATE_ID = "panorama-landing";

export const WEBSITE_TEMPLATE_OPTIONS = WEBSITE_TEMPLATE_CATALOG.filter(
  (templateOption) => !templateOption.hidden
);

const WEBSITE_TEMPLATE_LOOKUP = new Map(
  WEBSITE_TEMPLATE_CATALOG.map((templateOption) => [templateOption.id, templateOption])
);

export const WEBSITE_TEMPLATE_LAYOUTS = [...new Set(WEBSITE_TEMPLATE_CATALOG.map(({ layout }) => layout))];

export const getWebsiteTemplateById = (templateId) =>
  WEBSITE_TEMPLATE_LOOKUP.get(templateId) || WEBSITE_TEMPLATE_OPTIONS[0];

export const isWebsiteTemplateBuilderEnabled = (templateId) =>
  WEBSITE_TEMPLATE_LOOKUP.get(templateId)?.builderEnabled === true;
