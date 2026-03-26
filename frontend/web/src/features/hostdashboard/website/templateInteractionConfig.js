const DEFAULT_INTERACTION_SETTINGS = {
  moveDurationMs: 760,
  loopPauseMs: 1100,
  entryDelayMs: 180,
};

const createInteractionConfig = (steps, overrides = {}) => ({
  ...DEFAULT_INTERACTION_SETTINGS,
  ...overrides,
  steps,
});

export const TEMPLATE_INTERACTION_CONFIG = {
  panorama: createInteractionConfig([
    { targetId: "hero", holdMs: 1600 },
    { targetId: "search", holdMs: 1600 },
    { targetId: "details-card", holdMs: 1700 },
  ]),
  trustSignals: createInteractionConfig([
    { targetId: "hero", holdMs: 1600 },
    { targetId: "trust-reviews", holdMs: 1600 },
    { targetId: "trust-policies", holdMs: 1700 },
  ]),
  experienceJourney: createInteractionConfig([
    { targetId: "arrival-visual", holdMs: 1500 },
    { targetId: "stay-visual", holdMs: 1550 },
    { targetId: "surroundings-visual", holdMs: 1650 },
  ]),
  amenitiesSpotlight: createInteractionConfig([
    { targetId: "amenities-visual", holdMs: 1500 },
    { targetId: "amenity-comfort", holdMs: 1550 },
    { targetId: "amenity-kitchen", holdMs: 1650 },
  ]),
  galleryGrid: createInteractionConfig([
    { targetId: "gallery-hero", holdMs: 1450 },
    { targetId: "gallery-living", holdMs: 1500 },
    { targetId: "gallery-bedroom", holdMs: 1600 },
  ]),
  editorial: createInteractionConfig([
    { targetId: "primary-cta", holdMs: 1500 },
    { targetId: "editorial-visual", holdMs: 1550 },
    { targetId: "footer-food", holdMs: 1650 },
  ]),
  bookingFocus: createInteractionConfig([
    { targetId: "hero", holdMs: 1500 },
    { targetId: "quote-panel", holdMs: 1600 },
    { targetId: "quote-cta", holdMs: 1650 },
  ]),
  contactFocus: createInteractionConfig([
    { targetId: "contact-panel", holdMs: 1500 },
    { targetId: "details-panel", holdMs: 1550 },
    { targetId: "contact-cta", holdMs: 1650 },
  ]),
  localGuide: createInteractionConfig([
    { targetId: "hero", holdMs: 1500 },
    { targetId: "local-visual", holdMs: 1550 },
    { targetId: "local-cta", holdMs: 1650 },
  ]),
  featureStack: createInteractionConfig([
    { targetId: "hero", holdMs: 1500 },
    { targetId: "details-icon", holdMs: 1550 },
    { targetId: "cta-line", holdMs: 1650 },
  ]),
};

export const getTemplateInteractionConfig = (layout) => TEMPLATE_INTERACTION_CONFIG[layout] || null;
