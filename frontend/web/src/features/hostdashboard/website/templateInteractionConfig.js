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
  featureStack: createInteractionConfig([
    { targetId: "hero", holdMs: 1500 },
    { targetId: "details-icon", holdMs: 1550 },
    { targetId: "cta-line", holdMs: 1650 },
  ]),
};

export const getTemplateInteractionConfig = (layout) => TEMPLATE_INTERACTION_CONFIG[layout] || null;
