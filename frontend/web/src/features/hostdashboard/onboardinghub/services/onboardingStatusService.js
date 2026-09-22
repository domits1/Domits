import { getAccessToken, getCognitoUserId } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { fetchWebsiteDraftByPropertyId } from "../../website/services/websiteDraftService";
import { getChannexStatus, getChannexAriTargets } from "../../hostintegrations/channexApi";
import { getStripeAccountDetails } from "../../hostfinance/services/stripeAccountService";
import { getPriceLabsStatus } from "../../hostpricelabs/services/priceLabsService";
import { fetchTeamMembers } from "../../services/teamService";
import { fetchCompanyProfile } from "../../../../components/settings/api/companyProfile";

// NOTE: this only lists published properties (GET /property/hostDashboard/all).
// There is currently no backend endpoint to list a host's in-progress
// property_draft rows (only a single-draft-by-id lookup exists, and even that
// isn't deployed to API Gateway yet), so a listing that hasn't been published
// at least once cannot appear in this picker yet. See the Onboarding hub's
// empty state for how that gap is surfaced to the host.
export const fetchHostProperties = async () => {
  const response = await fetch(`${PROPERTY_API_BASE}/hostDashboard/all`, {
    method: "GET",
    headers: { Authorization: getAccessToken() },
  });

  if (!response.ok) {
    throw new Error("Could not load your listings.");
  }

  const data = await response.json();
  const listings = Array.isArray(data) ? data : [];

  return listings
    .map((entry) => ({
      propertyId: entry?.property?.id,
      title: entry?.property?.title || "Untitled listing",
      status: entry?.property?.status || null,
      createdAt: Number(entry?.property?.createdat) || 0,
    }))
    .filter((listing) => Boolean(listing.propertyId))
    .sort((first, second) => second.createdAt - first.createdAt);
};

// Every property returned by fetchHostProperties already exists as a real,
// published-or-publishable Property row (see the note above), so by
// definition this step is already done for anything the picker can show.
export const checkListPropertyStatus = () => ({ complete: true, scope: "property" });

export const checkWebsiteStatus = async (propertyId) => {
  try {
    const draft = await fetchWebsiteDraftByPropertyId(propertyId);
    return { complete: Boolean(draft), scope: "property" };
  } catch {
    return { complete: false, scope: "property", unknown: true };
  }
};

export const checkChannelsStatus = async (propertyId) => {
  const userId = getCognitoUserId();
  if (!userId) {
    return { complete: false, scope: "property", unknown: true };
  }

  try {
    const [statusResult, ariTargets] = await Promise.all([
      getChannexStatus({ userId }),
      getChannexAriTargets({ userId, domitsPropertyId: propertyId }),
    ]);

    const isAccountConnected = Boolean(statusResult?.connected ?? statusResult?.data?.connected);
    const targets = Array.isArray(ariTargets) ? ariTargets : ariTargets?.data;
    const isPropertyMapped = Array.isArray(targets) && targets.length > 0;

    return { complete: isAccountConnected && isPropertyMapped, scope: "property" };
  } catch {
    return { complete: false, scope: "property", unknown: true };
  }
};

// Stripe and PriceLabs are both account-wide (keyed by host, not property) —
// see the plan discussion: there is no property_id on either connection
// record today. "Complete" here means the host has connected once, and
// applies identically to every one of the host's properties.
export const checkPaymentsStatus = async () => {
  try {
    const stripeDetails = await getStripeAccountDetails();
    return { complete: Boolean(stripeDetails), scope: "account" };
  } catch {
    return { complete: false, scope: "account", unknown: true };
  }
};

export const checkPricingStatus = async () => {
  try {
    const priceLabsStatus = await getPriceLabsStatus();
    return { complete: Boolean(priceLabsStatus?.connected), scope: "account" };
  } catch {
    return { complete: false, scope: "account", unknown: true };
  }
};

// There is no backend concept of "task setup complete" today — property-tasks
// is a working checklist, not a one-time setup step — so this is always
// reported as unknown. It's optional in the Go Live checklist, so this never
// blocks publishing; it's shown for visibility only.
export const checkTasksStatus = async () => ({ complete: false, scope: "account", unknown: true });

export const checkGoLiveStatus = (property) => ({
  complete: String(property?.status || "").toUpperCase() === "ACTIVE",
  scope: "property",
});

// --- Enterprise onboarding (portfolio-wide, not scoped to one listing) ---

export const checkCompanyStatus = async () => {
  try {
    const profile = await fetchCompanyProfile();
    return { complete: Boolean(profile?.companyName), scope: "account" };
  } catch {
    return { complete: false, scope: "account", unknown: true };
  }
};

// The host is never written as a team_member row (see backend host-team
// service: rows are only created via invites), so this length check reflects
// "at least one other person invited" rather than always being true.
export const checkTeamStatus = async () => {
  try {
    const members = await fetchTeamMembers();
    return { complete: Array.isArray(members) && members.length > 0, scope: "account" };
  } catch {
    return { complete: false, scope: "account", unknown: true };
  }
};

export const checkAnyPropertyListedStatus = (properties) => ({
  complete: Array.isArray(properties) && properties.length > 0,
  scope: "account",
});

const WEBSITE_STATUS_BATCH_SIZE = 10;

const checkSingleWebsiteDraft = async (propertyId) => {
  try {
    const draft = await fetchWebsiteDraftByPropertyId(propertyId);
    return { ok: true, hasDraft: Boolean(draft) };
  } catch {
    return { ok: false, hasDraft: false };
  }
};

// Enterprise portfolios run into the hundreds or thousands of units, so this
// checks in bounded batches with an early exit on the first draft found,
// instead of firing one request per property all at once. If every single
// lookup in the portfolio fails, that's reported as unknown rather than a
// false "not started" — a run of network errors shouldn't read as "no host
// has started a website".
export const checkAnyWebsiteStatus = async (properties) => {
  const propertyIds = (Array.isArray(properties) ? properties : [])
    .map((property) => property?.propertyId)
    .filter(Boolean);

  if (propertyIds.length === 0) {
    return { complete: false, scope: "account" };
  }

  let successCount = 0;

  for (let i = 0; i < propertyIds.length; i += WEBSITE_STATUS_BATCH_SIZE) {
    const batch = propertyIds.slice(i, i + WEBSITE_STATUS_BATCH_SIZE);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(batch.map(checkSingleWebsiteDraft));

    if (results.some((result) => result.hasDraft)) {
      return { complete: true, scope: "account" };
    }
    successCount += results.filter((result) => result.ok).length;
  }

  if (successCount === 0) {
    return { complete: false, scope: "account", unknown: true };
  }
  return { complete: false, scope: "account" };
};

// Unlike the single-listing hub's checkChannelsStatus, this only requires the
// Channex account to be connected — it doesn't require every property to be
// individually mapped, since that's a per-property step the host works
// through over time, not a one-shot account setup gate.
export const checkAccountChannelsStatus = async () => {
  const userId = getCognitoUserId();
  if (!userId) {
    return { complete: false, scope: "account", unknown: true };
  }

  try {
    const statusResult = await getChannexStatus({ userId });
    const isAccountConnected = Boolean(statusResult?.connected ?? statusResult?.data?.connected);
    return { complete: isAccountConnected, scope: "account" };
  } catch {
    return { complete: false, scope: "account", unknown: true };
  }
};

// There is no "connected"/"complete" concept for the general marketplace
// today — same treatment as checkTasksStatus above: visibility only, never
// blocks Go Live.
export const checkMarketplaceStatus = async () => ({ complete: false, scope: "account", unknown: true });
