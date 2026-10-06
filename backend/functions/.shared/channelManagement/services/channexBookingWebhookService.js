import { CHANNEX_STATUS } from "../channelManagementConstants.js";
import { hasChannexRequiredCredentialFields } from "../providers/channex/credentialUtils.js";
import { CHANNEX_BOOKING_POLL_SYNC_TYPE, buildChannexBookingPollConfig } from "../utils/channexBookingPollUtils.js";
import { classifyWebhookPullResult, isTemporaryError } from "../utils/channexBookingWebhookClassification.js";

// API Gateway gives up after 29 seconds; the rest of the feed waits for Channex's retry.
const WEBHOOK_TIME_BUDGET_MS = 20_000;
const WEBHOOK_TRIGGER = "WEBHOOK";

const answer = (statusCode, outcome, extra = {}) => ({ statusCode, outcome, ...extra });

const isConnected = (integration) =>
  Boolean(integration) && String(integration.status || "").toUpperCase() !== CHANNEX_STATUS.DISCONNECTED;

export default class ChannexBookingWebhookService {
  constructor({ props, accounts, channexCredentialStore, sync, pullLatestChannexBookingsForResolvedContext, now = Date.now }) {
    this.props = props;
    this.accounts = accounts;
    this.channexCredentialStore = channexCredentialStore;
    this.sync = sync;
    this.pullLatestChannexBookingsForResolvedContext = pullLatestChannexBookingsForResolvedContext;
    this.now = now;
  }

  async readChannexSecret(integration) {
    try {
      const secret = await this.channexCredentialStore.readSecretOrNull(integration.credentialsRef);
      return hasChannexRequiredCredentialFields(secret) ? { secret } : { outcome: "CREDENTIALS_INVALID" };
    } catch {
      return { outcome: "CREDENTIALS_UNREADABLE" };
    }
  }

  // Always answers with a status: a thrown error would reach the handler's generic 500, and Channex
  // would retry even a failure that can never succeed.
  async receiveBookingEvent({ externalPropertyId, receivedAtMs = this.now() }) {
    try {
      return await this.processBookingEvent({ externalPropertyId, receivedAtMs });
    } catch (error) {
      return isTemporaryError(error) ? answer(503, "UNEXPECTED_TEMPORARY_ERROR") : answer(200, "UNEXPECTED_ERROR");
    }
  }

  async processBookingEvent({ externalPropertyId, receivedAtMs }) {
    const mapping = await this.props.findActiveChannexMappingByExternalPropertyId(externalPropertyId);
    if (!mapping) return answer(200, "PROPERTY_NOT_MAPPED");

    const integration = await this.accounts.getById(mapping.integrationAccountId);
    if (!isConnected(integration)) return answer(200, "INTEGRATION_NOT_CONNECTED");

    const credentials = await this.readChannexSecret(integration);
    if (credentials.outcome === "CREDENTIALS_UNREADABLE") return answer(503, credentials.outcome);
    if (credentials.outcome) return answer(200, credentials.outcome);

    // Same key and expiry as booking polling, so a webhook and a poll never pull one property at once.
    const lockKey = `${CHANNEX_BOOKING_POLL_SYNC_TYPE}:${mapping.domitsPropertyId}`;
    const { lockStaleMs } = buildChannexBookingPollConfig();
    const lock = await this.sync.tryAcquireLock(integration.id, lockKey, { staleBeforeMs: this.now() - lockStaleMs });
    if (!lock?.acquired) return answer(503, "LOCKED");

    // Stays UNEXPECTED_ERROR if the pull throws, so the lock is released as FAILED.
    let result = answer(200, "UNEXPECTED_ERROR");
    try {
      const pull = await this.pullLatestChannexBookingsForResolvedContext({
        normalizedUserId: integration.userId,
        normalizedDomitsPropertyId: mapping.domitsPropertyId,
        integration,
        propertyMapping: mapping,
        secret: credentials.secret,
        trigger: WEBHOOK_TRIGGER,
        deadlineMs: receivedAtMs + WEBHOOK_TIME_BUDGET_MS,
      });
      const counts = pull?.response || {};
      result = {
        ...classifyWebhookPullResult(pull),
        fetchedCount: counts.fetchedCount ?? 0,
        ackedCount: counts.ackedCount ?? 0,
        unackedCount: counts.unackedCount ?? 0,
        feedMeta: counts.feedMeta ?? null,
      };
      if (result.outcome === "FEED_UNAUTHORIZED") {
        await this.accounts.touchSyncFailure(
          integration.id,
          "CHANNEX_BOOKING_FEED_UNAUTHORIZED",
          "Channex rejected the account's API key on the booking feed."
        );
      }
    } finally {
      await this.sync
        .releaseLock(integration.id, lockKey, {
          status: result.outcome === "PROCESSED" ? "SUCCESS" : "FAILED",
          lastSyncedAt: this.now(),
        })
        // A lock that cannot be released expires after lockStaleMs; the answer to Channex stands.
        .catch(() => null);
    }

    return { ...result, domitsPropertyId: mapping.domitsPropertyId };
  }
}
