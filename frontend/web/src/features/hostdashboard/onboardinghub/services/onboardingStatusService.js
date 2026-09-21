import { getAccessToken, getCognitoUserId } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { fetchWebsiteDraftByPropertyId } from "../../website/services/websiteDraftService";
import { getChannexStatus, getChannexAriTargets } from "../../hostintegrations/channexApi";
import { getStripeAccountDetails } from "../../hostfinance/services/stripeAccountService";
import { getPriceLabsStatus } from "../../hostpricelabs/services/priceLabsService";

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
