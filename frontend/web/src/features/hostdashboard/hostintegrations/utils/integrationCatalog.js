export const INTEGRATION_STATUS = Object.freeze({
  AVAILABLE: "available",
  IN_DEVELOPMENT: "in_development",
  ON_REQUEST: "on_request",
});

export const INTEGRATION_CATEGORY = Object.freeze({
  REVENUE_MANAGEMENT: "revenue_management",
  CHANNEL_MANAGEMENT: "channel_management",
  GUEST_PROTECTION: "guest_protection",
  SMART_LOCKS: "smart_locks",
  GUEST_COMMUNICATION: "guest_communication",
});

export const TALK_TO_SALES_PATH = "/contact";

const integration = ({ id, name, category, status }) =>
  Object.freeze({ id, name, category, status, logo: null, link: TALK_TO_SALES_PATH });

export const INTEGRATION_CATALOG = Object.freeze([
  integration({
    id: "pricelabs",
    name: "PriceLabs",
    category: INTEGRATION_CATEGORY.REVENUE_MANAGEMENT,
    status: INTEGRATION_STATUS.AVAILABLE,
  }),
  integration({
    id: "channex",
    name: "Channex",
    category: INTEGRATION_CATEGORY.CHANNEL_MANAGEMENT,
    status: INTEGRATION_STATUS.AVAILABLE,
  }),
  integration({
    id: "siteminder",
    name: "SiteMinder",
    category: INTEGRATION_CATEGORY.CHANNEL_MANAGEMENT,
    status: INTEGRATION_STATUS.IN_DEVELOPMENT,
  }),
  integration({
    id: "truvi",
    name: "Truvi",
    category: INTEGRATION_CATEGORY.GUEST_PROTECTION,
    status: INTEGRATION_STATUS.IN_DEVELOPMENT,
  }),
  integration({
    id: "remotelock",
    name: "RemoteLock",
    category: INTEGRATION_CATEGORY.SMART_LOCKS,
    status: INTEGRATION_STATUS.IN_DEVELOPMENT,
  }),
  integration({
    id: "whatsapp",
    name: "WhatsApp",
    category: INTEGRATION_CATEGORY.GUEST_COMMUNICATION,
    status: INTEGRATION_STATUS.IN_DEVELOPMENT,
  }),
]);
