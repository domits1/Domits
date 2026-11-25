// Pure rules for what the Distribution tab shows per listing and per OTA card (design note #3954,
// D3 and D7). No React and no requests, so every rule is table-tested.
//
// The backend sends a `label` per channel (Enes's contract). This file maps it
// to what the host sees and never recomputes it from anything else.

export const PLATFORMS = [
  { otaCode: "BookingCom", name: "Booking.com" },
  { otaCode: "Airbnb", name: "Airbnb" },
  { otaCode: "Vrbo", name: "Vrbo" },
];

export const LISTING_VIEW = {
  NOT_READY: "NOT_READY",
  SETTING_UP: "SETTING_UP",
  CARDS: "CARDS",
};

export const DISTRIBUTION_STATUS = {
  NOT_ENABLED: "NOT_ENABLED",
  PROVISIONING: "PROVISIONING",
  READY: "READY",
};

const MISSING_ITEM_SENTENCES = {
  NOT_PUBLISHED: "Publish your listing first",
  MISSING_ADDRESS: "Add the address",
  MISSING_GUESTS: "Add the maximum number of guests",
  MISSING_PRICE: "Add a price",
};

const GENERIC_MISSING_SENTENCE = "Complete your listing first";

const NOT_CONNECTED = { label: "Not connected", tone: "neutral", switchOn: false, switchDisabled: false };

// Keyed by the channel's label. A switch that is on means "connected or being connected".
// DISCONNECTING reads as off and locked: the host just asked for it, and a second click must not
// start another disconnect. UNKNOWN is Channex not answering: the channel exists, so the switch is
// on, but locked, because nothing can be said about it until a Refresh gets an answer.
// DISCONNECTING and NEEDS_ATTENTION are no longer in the contract; the mock of #4007 still uses them.
const CHANNEL_STATES = {
  SYNCING: { label: "Syncing…", tone: "pending", switchOn: true, switchDisabled: false },
  LIVE: { label: "Live", tone: "success", switchOn: true, switchDisabled: false },
  DISCONNECTING: { label: "Disconnecting…", tone: "pending", switchOn: false, switchDisabled: true },
  DISCONNECTED: { label: "Disconnected", tone: "neutral", switchOn: false, switchDisabled: false },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "error", switchOn: true, switchDisabled: false },
  UNKNOWN: { label: "Status unknown", tone: "neutral", switchOn: true, switchDisabled: true },
};

// A label outside the list reads like UNKNOWN: neutral and locked, never Live.
const UNKNOWN_CHANNEL_STATE = CHANNEL_STATES.UNKNOWN;
const UNKNOWN_NOTE = "We couldn't check this connection. Click Refresh to try again.";

// A listing with missing items shows what is missing, and one being set up shows that, each instead of
// the cards. Missing items win: a listing that cannot be set up has nothing to resume yet.
export function describeListingView(listing) {
  if (listing.distribution?.missing?.length) return LISTING_VIEW.NOT_READY;
  if (listing.distribution?.status === DISTRIBUTION_STATUS.PROVISIONING) return LISTING_VIEW.SETTING_UP;
  return LISTING_VIEW.CARDS;
}

export function describeMissingItems(missingCodes = []) {
  const sentences = missingCodes.map((code) => MISSING_ITEM_SENTENCES[code]).filter(Boolean);
  return sentences.length > 0 ? sentences : [GENERIC_MISSING_SENTENCE];
}

// The contract carries no error detail for a channel, so the sentence is the same for every cause.
const describeAttentionNote = (platformName) => `Something needs your attention on ${platformName}.`;

export function describePlatformCard(listing, otaCode) {
  const platformName = PLATFORMS.find((platform) => platform.otaCode === otaCode)?.name ?? otaCode;

  const channel = listing.channels?.find((candidate) => candidate.otaCode === otaCode);
  if (!channel) return { ...NOT_CONNECTED, note: null };

  // hasOwn: a label such as "constructor" must not find a function on the prototype.
  const state = Object.hasOwn(CHANNEL_STATES, channel.label) ? CHANNEL_STATES[channel.label] : UNKNOWN_CHANNEL_STATE;
  if (state === CHANNEL_STATES.NEEDS_ATTENTION) return { ...state, note: describeAttentionNote(platformName) };
  if (state === CHANNEL_STATES.UNKNOWN) return { ...state, note: UNKNOWN_NOTE };
  return { ...state, note: null };
}
