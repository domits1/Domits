// Pure rules for what the Distribution tab shows per listing and per OTA card (design note #3954,
// D3 and D7). No React and no requests, so every rule is table-tested.
//
// The backend sends a `displayState` per channel (proposed, to confirm with Enes). This file maps it
// to what the host sees and never recomputes it from the raw channel row.

export const PLATFORMS = [
  { otaCode: "BookingCom", name: "Booking.com" },
  { otaCode: "Airbnb", name: "Airbnb" },
  { otaCode: "Vrbo", name: "Vrbo" },
];

export const LISTING_VIEW = {
  NOT_READY: "NOT_READY",
  SETUP_FAILED: "SETUP_FAILED",
  CARDS: "CARDS",
};

export const DISTRIBUTION_STATUS = {
  NOT_ENABLED: "NOT_ENABLED",
  PROVISIONING: "PROVISIONING",
  PROVISIONING_FAILED: "PROVISIONING_FAILED",
  READY: "READY",
};

const MISSING_ITEM_SENTENCES = {
  STATUS_NOT_ACTIVE: "Publish your listing first",
  LOCATION_MISSING: "Add the address",
  MAX_GUESTS_MISSING: "Add the maximum number of guests",
  PRICE_MISSING: "Add a price",
};

const GENERIC_MISSING_SENTENCE = "Complete your listing first";

const NOT_CONNECTED = { label: "Not connected", tone: "neutral", switchOn: false, switchDisabled: false };

// Keyed by the channel's displayState. A switch that is on means "connected or being connected".
// DISCONNECTING reads as off and locked: the host just asked for it, and a second click must not
// start another disconnect.
const CHANNEL_STATES = {
  SYNCING: { label: "Syncing…", tone: "pending", switchOn: true, switchDisabled: false },
  LIVE: { label: "Live", tone: "success", switchOn: true, switchDisabled: false },
  DISCONNECTING: { label: "Disconnecting…", tone: "pending", switchOn: false, switchDisabled: true },
  DISCONNECTED: { label: "Disconnected", tone: "neutral", switchOn: false, switchDisabled: false },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "error", switchOn: true, switchDisabled: false },
};

// An unknown displayState must not read as healthy, so it gets the attention state.
const UNKNOWN_CHANNEL_STATE = CHANNEL_STATES.NEEDS_ATTENTION;

const SETTING_UP = { label: "Setting up…", tone: "pending", switchOn: false, switchDisabled: true };

// Readiness wins over a failed setup: a listing that cannot be set up has nothing to retry yet.
export function describeListingView(listing) {
  if (!listing.readiness?.ready) return LISTING_VIEW.NOT_READY;
  if (listing.distribution?.status === DISTRIBUTION_STATUS.PROVISIONING_FAILED) return LISTING_VIEW.SETUP_FAILED;
  return LISTING_VIEW.CARDS;
}

export function describeMissingItems(missingCodes = []) {
  const sentences = missingCodes.map((code) => MISSING_ITEM_SENTENCES[code]).filter(Boolean);
  return sentences.length > 0 ? sentences : [GENERIC_MISSING_SENTENCE];
}

function describeAttentionNote(channel, platformName) {
  // The raw lastErrorCode is written for engineers, so it is never shown.
  if (channel.disconnectedOutsideDomits) {
    return `Disconnected outside Domits. Close your dates on ${platformName} yourself: Domits can no longer close them.`;
  }
  return `Something needs your attention on ${platformName}.`;
}

export function describePlatformCard(listing, otaCode) {
  const platformName = PLATFORMS.find((platform) => platform.otaCode === otaCode)?.name ?? otaCode;

  if (listing.distribution?.status === DISTRIBUTION_STATUS.PROVISIONING) return { ...SETTING_UP, note: null };

  const channel = listing.channels?.find((candidate) => candidate.otaCode === otaCode);
  if (!channel) return { ...NOT_CONNECTED, note: null };

  const state = CHANNEL_STATES[channel.displayState] ?? UNKNOWN_CHANNEL_STATE;
  const needsAttention = state === CHANNEL_STATES.NEEDS_ATTENTION;
  return { ...state, note: needsAttention ? describeAttentionNote(channel, platformName) : null };
}
