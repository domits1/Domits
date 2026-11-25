import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../../integrations/repositories/integrationPropertyRepository.js";
import ChannexCredentialStore from "../providers/channex/credentialStore.js";
import ChannexProviderClient from "../providers/channex/providerClient.js";
import ListingDistributionRepository from "../repositories/listingDistributionRepository.js";
import { buildChannexIframeUrl } from "../utils/channexIframeUrl.js";
import { refuseUnlessHostListing } from "../utils/hostListingAccess.js";

// Opens Channex's channel screen for one listing (design note D1, #506).
// The Channex property comes from the listing's live mapping after the owner check, never from the
// browser: Domits' one Channex account holds every host's property, so the token's property_id is
// what keeps a host inside their own listing.

const bad = (statusCode, response) => ({ statusCode, response });
const ok = (response) => ({ statusCode: 200, response });
const notConfigured = () =>
  bad(503, {
    error: "Distribution is not available right now. Please contact support.",
    errorCode: "DISTRIBUTION_NOT_CONFIGURED",
  });

const CHANNEL = "CHANNEX";
const ACTIVE = "ACTIVE";
// Channex's one-time token lives 15 minutes and works once.
const TOKEN_LIFETIME_SECONDS = 15 * 60;

export default class ChannexConnectSessionService {
  constructor({
    listings = new ListingDistributionRepository(),
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    channex = new ChannexProviderClient(),
    credentialStore = new ChannexCredentialStore(),
    channexBaseUrl = process.env.CHANNEX_BASE_URL || "https://staging.channex.io",
  } = {}) {
    Object.assign(this, { listings, accounts, props, channex, credentialStore, channexBaseUrl });
  }

  async createConnectSession({ userId, domitsPropertyId }) {
    const listing = await this.listings.findListing(domitsPropertyId);
    const refusal = refuseUnlessHostListing(listing, userId);
    if (refusal) return refusal;

    const mapping = await this.findLiveMapping(userId, listing.propertyId);
    if (!mapping) {
      return bad(409, {
        error: "Distribution is not turned on for this listing yet. Turn it on first, then connect a channel.",
        errorCode: "DISTRIBUTION_NOT_TURNED_ON",
      });
    }

    const account = mapping.account;
    const secret = await this.credentialStore.readSecretOrNull(account.credentialsRef);
    if (!secret?.apiKey) {
      return notConfigured();
    }

    const token = await this.channex.createOneTimeToken(
      { apiKey: secret.apiKey },
      { propertyId: mapping.externalPropertyId, username: userId }
    );
    if (!token.success) {
      return bad(502, {
        error: "Channex could not open the connection screen. Try again in a moment.",
        errorCode: "DISTRIBUTION_CONNECT_SESSION_FAILED",
      });
    }

    return ok({
      iframeUrl: buildChannexIframeUrl({
        baseUrl: this.channexBaseUrl,
        token: token.token,
        channexPropertyId: mapping.externalPropertyId,
      }),
      expiresInSeconds: TOKEN_LIFETIME_SECONDS,
    });
  }

  // Only a live (ACTIVE) mapping has a Channex property to open; a claim still being provisioned does not.
  async findLiveMapping(userId, domitsPropertyId) {
    const account = await this.accounts.findByUserIdAndChannel(userId, CHANNEL);
    if (!account) return null;
    const mapping = await this.props.findInUseByAccountAndListing(account.id, domitsPropertyId);
    if (mapping?.status !== ACTIVE || !mapping.externalPropertyId) return null;
    return { ...mapping, account };
  }
}
