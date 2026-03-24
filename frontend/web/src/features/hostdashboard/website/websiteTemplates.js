const WEBSITE_TEMPLATE_CATALOG = [
  {
    id: "panorama-landing",
    name: "Panorama Landing",
    description: "Large hero image with fast trust signals and a guided booking call-to-action.",
    layout: "panorama",
  },
  {
    id: "trust-signals",
    name: "Trust Signals",
    description: "A reassuring landing page with reviews, guest highlights, policy clarity, and a soft booking nudge.",
    layout: "trustSignals",
  },
  {
    id: "experience-journey",
    name: "Experience Journey",
    description: "A curated flow that walks guests through arrival, stay, surroundings, and next steps.",
    layout: "experienceJourney",
  },
  {
    id: "amenities-spotlight",
    name: "Amenities Spotlight",
    description: "A feature-led layout that puts standout amenities and property strengths front and center.",
    layout: "amenitiesSpotlight",
  },
  {
    id: "gallery-grid",
    name: "Gallery Grid",
    description: "Photo-first browsing with a clean grid for guests who compare on visuals.",
    layout: "galleryGrid",
  },
  {
    id: "editorial-split",
    name: "Editorial Split",
    description: "Story-led content on the left with a visual property showcase on the right.",
    layout: "editorial",
  },
  {
    id: "booking-focus",
    name: "Booking Focus",
    description: "A booking-led layout with a visible quote panel for guests ready to decide faster.",
    layout: "bookingFocus",
  },
  {
    id: "contact-focus",
    name: "Contact Focus",
    description: "Balanced content sections with a strong footer action for direct guest contact.",
    layout: "contactFocus",
  },
  {
    id: "local-guide",
    name: "Local Guide",
    description: "A location-led page that highlights the area, nearby spots, and the context around the stay.",
    layout: "localGuide",
  },
  {
    id: "feature-stack",
    name: "Feature Stack",
    description: "A landing page with quick checks, value blocks, and a simple flow down the page.",
    layout: "featureStack",
    hidden: true,
  },
];

export const WEBSITE_TEMPLATE_OPTIONS = WEBSITE_TEMPLATE_CATALOG.filter(
  (templateOption) => !templateOption.hidden
);

const WEBSITE_TEMPLATE_LOOKUP = new Map(
  WEBSITE_TEMPLATE_CATALOG.map((templateOption) => [templateOption.id, templateOption])
);

export const WEBSITE_TEMPLATE_LAYOUTS = [...new Set(WEBSITE_TEMPLATE_CATALOG.map(({ layout }) => layout))];

export const getWebsiteTemplateById = (templateId) =>
  WEBSITE_TEMPLATE_LOOKUP.get(templateId) || WEBSITE_TEMPLATE_OPTIONS[0];
