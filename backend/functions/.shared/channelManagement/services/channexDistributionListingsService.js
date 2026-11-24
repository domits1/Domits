import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../../integrations/repositories/integrationPropertyRepository.js";
import ChannexCredentialStore from "../providers/channex/credentialStore.js";
import ChannexProviderClient from "../providers/channex/providerClient.js";
import ChannexAriOutboxRepository from "../repositories/channexAriOutboxRepository.js";
import ListingDistributionRepository from "../repositories/listingDistributionRepository.js";
import { channelDisplayLabel } from "../utils/channelDisplayLabel.js";
import { refuseUnlessHostListing } from "../utils/hostListingAccess.js";
import { listingDistributionReadiness } from "../utils/listingDistributionReadiness.js";

// The listings of the Distribution tab, in the shape the frontend cards read (design note D7, section 6).
// Channex is the source of truth for the OTAs; Domits keeps no channel table until disconnect (D5) needs one.

const ok = (response) => ({ statusCode: 200, response });

const CHANNEL = "CHANNEX";
const ACTIVE = "ACTIVE";
const PROVISIONING = "PROVISIONING";
const DISTRIBUTION_STATUS = Object.freeze({ NOT_ENABLED: "NOT_ENABLED", PROVISIONING: "PROVISIONING", READY: "READY" });

const distributionStatusOf = (mapping) => {
  if (mapping?.status === ACTIVE && mapping.externalPropertyId) return DISTRIBUTION_STATUS.READY;
  if (mapping?.status === PROVISIONING) return DISTRIBUTION_STATUS.PROVISIONING;
  return DISTRIBUTION_STATUS.NOT_ENABLED;
};

export default class ChannexDistributionListingsService {
  constructor({
    listings = new ListingDistributionRepository(),
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    outbox = new ChannexAriOutboxRepository(),
    channex = new ChannexProviderClient(),
    credentialStore = new ChannexCredentialStore(),
  } = {}) {
    Object.assign(this, { listings, accounts, props, outbox, channex, credentialStore });
  }

  async refreshListing({ userId, domitsPropertyId }) {
    const listing = await this.listings.findListing(domitsPropertyId);
    const refusal = refuseUnlessHostListing(listing, userId);
    if (refusal) return refusal;

    const account = await this.accounts.findByUserIdAndChannel(userId, CHANNEL);
    return ok({ listing: await this.describeListing(listing, account) });
  }

  async describeListing(listing, account) {
    const mapping = account ? await this.props.findInUseByAccountAndListing(account.id, listing.propertyId) : null;
    const status = distributionStatusOf(mapping);
    const readiness = listingDistributionReadiness(listing);
    const described = {
      propertyId: listing.propertyId,
      title: listing.title,
      readiness: { ready: readiness.ready, missing: readiness.missing ?? [] },
      distribution: { status },
      channels: [],
    };
    if (status !== DISTRIBUTION_STATUS.READY) return described;

    const channels = await this.readChannelsOrNull(account, mapping.externalPropertyId, listing.propertyId);
    return channels ? { ...described, channels } : { ...described, channelsUnavailable: true };
  }

  async readChannelsOrNull(account, externalPropertyId, domitsPropertyId) {
    try {
      return await this.readChannels(account, externalPropertyId, domitsPropertyId);
    } catch (error) {
      console.error(
        JSON.stringify({ event: "CHANNEX_DISTRIBUTION_CHANNELS_UNAVAILABLE", domitsPropertyId, error: error?.message })
      );
      return null;
    }
  }

  // Null when Channex or the key cannot answer: the tab then shows the OTAs as unknown, never as live.
  async readChannels(account, externalPropertyId, domitsPropertyId) {
    const secret = await this.credentialStore.readSecretOrNull(account.credentialsRef);
    if (!secret?.apiKey) return null;
    const listed = await this.channex.listChannels({ apiKey: secret.apiKey }, externalPropertyId);
    if (!listed.success) return null;
    const pendingOutbox = await this.outbox.hasWaitingRows(domitsPropertyId);
    return listed.channels.map(({ channexChannelId, otaCode, isActive }) => ({
      channexChannelId,
      otaCode,
      label: channelDisplayLabel({ isActive, pendingOutbox }),
    }));
  }
}
