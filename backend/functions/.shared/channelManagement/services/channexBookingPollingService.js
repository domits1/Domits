import { randomUUID } from "node:crypto";

import { CHANNEX_STATUS } from "../channelManagementConstants.js";
import { hasChannexRequiredCredentialFields } from "../providers/channex/credentialUtils.js";
import {
  CHANNEL_CHANNEX,
  CHANNEX_BOOKING_POLL_ACTION,
  CHANNEX_BOOKING_POLL_SYNC_TYPE,
  allowlistIncludes,
  applyChannexBookingPollPropertyResult,
  buildChannexBookingPollConfig,
  buildChannexBookingPollPropertySummary,
  createEmptyChannexBookingPollResponse,
  hasRequiredChannexBookingPollAllowlists,
  isActiveChannexPropertyMapping,
} from "../utils/channexBookingPollUtils.js";
import { buildChannexPullIssue } from "../utils/channexBookingRevisionUtils.js";

const nowMs = () => Date.now();
const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});
const stringifyJsonOrNull = (value) => {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      serializationError: true,
      details: describeLocalError(error),
    });
  }
};

export default class ChannexBookingPollingService {
  constructor({
    accounts,
    props,
    sync,
    channexCredentialStore,
    pullLatestChannexBookingsForResolvedContext,
  }) {
    this.accounts = accounts;
    this.props = props;
    this.sync = sync;
    this.channexCredentialStore = channexCredentialStore;
    this.pullLatestChannexBookingsForResolvedContext = pullLatestChannexBookingsForResolvedContext;
  }

  async writePollLog({ integration, startedAt, status, summary, error = null }) {
    if (typeof this.sync?.insertLog !== "function") return null;

    const finishedAt = nowMs();
    const details = error
      ? { summary, error: describeLocalError(error) }
      : { summary };

    try {
      return await this.sync.insertLog({
        id: randomUUID(),
        integrationAccountId: integration?.id ?? null,
        syncType: CHANNEX_BOOKING_POLL_SYNC_TYPE,
        direction: "IMPORT",
        status,
        startedAt,
        finishedAt,
        itemsProcessed: Number(summary?.fetchedCount || 0),
        errorCode: error?.code || null,
        errorMessage: error?.message || null,
        details: stringifyJsonOrNull(details),
      });
    } catch {
      return null;
    }
  }

  async acquirePollLock(integration, domitsPropertyId, lockStaleMs) {
    const syncType = `${CHANNEX_BOOKING_POLL_SYNC_TYPE}:${domitsPropertyId}`;
    if (typeof this.sync?.tryAcquireLock !== "function") {
      return {
        acquired: true,
        syncType,
        bestEffortOnly: true,
      };
    }

    const lock = await this.sync.tryAcquireLock(integration.id, syncType, {
      staleBeforeMs: nowMs() - lockStaleMs,
    });
    return {
      ...lock,
      syncType,
    };
  }

  async releasePollLock({ integration, syncType, status, lastSuccessfulItemAt = null }) {
    if (typeof this.sync?.releaseLock !== "function") return null;

    try {
      return await this.sync.releaseLock(integration.id, syncType, {
        status,
        lastSyncedAt: nowMs(),
        lastSuccessfulItemAt,
      });
    } catch {
      return null;
    }
  }

  async pollProperty({
    integration,
    propertyMapping,
    secret,
    config,
    startedAt,
    aggregate,
    accountResult,
  }) {
    const domitsPropertyId = requireStr(propertyMapping?.domitsPropertyId);
    const lock = await this.acquirePollLock(integration, domitsPropertyId, config.lockStaleMs);
    if (!lock.acquired) {
      const warning = buildChannexPullIssue(
        "CHANNEX_BOOKING_POLL_LOCKED",
        "Channex booking poll skipped because another poll is already running for this property."
      );
      const lockedSummary = buildChannexBookingPollPropertySummary({
        integration,
        propertyMapping,
        result: "skipped-locked",
        warnings: [warning],
      });
      aggregate.propertiesSkippedCount += 1;
      aggregate.warnings.push(warning);
      aggregate.propertyResults.push(lockedSummary);
      accountResult.propertiesSkippedCount += 1;
      await this.writePollLog({
        integration,
        startedAt,
        status: "SKIPPED",
        summary: lockedSummary,
      });
      return;
    }

    let lockStatus = "FAILED";
    let lastSuccessfulItemAt = null;
    try {
      const pullResult = await this.pullLatestChannexBookingsForResolvedContext({
        normalizedUserId: requireStr(integration?.userId),
        normalizedDomitsPropertyId: domitsPropertyId,
        integration,
        propertyMapping,
        secret,
        startedAt,
        syncType: CHANNEX_BOOKING_POLL_SYNC_TYPE,
        action: CHANNEX_BOOKING_POLL_ACTION,
        trigger: config.trigger,
      });
      const propertyResponse = pullResult?.response || {};
      const propertySummary = buildChannexBookingPollPropertySummary({
        integration,
        propertyMapping,
        result: propertyResponse.overallSuccess ? "processed" : "processed-with-issues",
        statusCode: pullResult?.statusCode ?? 200,
        overallSuccess: propertyResponse.overallSuccess === true,
        counts: propertyResponse,
        evidenceId: propertyResponse.evidenceId ?? null,
        warnings: Array.isArray(propertyResponse.warnings) ? propertyResponse.warnings : [],
        errors: Array.isArray(propertyResponse.errors) ? propertyResponse.errors : [],
      });

      applyChannexBookingPollPropertyResult(aggregate, propertySummary, propertyResponse);
      if (propertyResponse.overallSuccess) {
        lockStatus = "SUCCESS";
      } else if (propertyResponse.ackedCount > 0) {
        lockStatus = "PARTIAL";
      }
      lastSuccessfulItemAt = propertyResponse.ackedCount > 0 ? nowMs() : null;
      await this.writePollLog({
        integration,
        startedAt,
        status: lockStatus,
        summary: propertySummary,
      });
    } catch (error) {
      const details = describeLocalError(error);
      const propertySummary = buildChannexBookingPollPropertySummary({
        integration,
        propertyMapping,
        result: "failed",
        statusCode: 500,
        errors: [
          buildChannexPullIssue(
            details.code || "CHANNEX_BOOKING_POLL_PROPERTY_FAILED",
            details.message || "Channex booking poll failed for this property.",
            { details }
          ),
        ],
      });
      aggregate.errors.push(...propertySummary.errors);
      aggregate.propertyResults.push(propertySummary);
      await this.writePollLog({
        integration,
        startedAt,
        status: "FAILED",
        summary: propertySummary,
        error,
      });
    } finally {
      await this.releasePollLock({
        integration,
        syncType: lock.syncType,
        status: lockStatus,
        lastSuccessfulItemAt,
      });
    }
  }

  async readPollSecret(integration) {
    try {
      const secret = await this.channexCredentialStore.readSecretOrNull(integration.credentialsRef);
      if (secret && typeof secret === "object" && !Array.isArray(secret) && hasChannexRequiredCredentialFields(secret)) {
        return { ok: true, secret };
      }
      return {
        ok: false,
        warning: buildChannexPullIssue(
          "CHANNEX_SECRET_INVALID",
          "Stored Channex secret is missing, unreadable, or incomplete. Poll skipped for this account."
        ),
      };
    } catch (error) {
      return {
        ok: false,
        warning: buildChannexPullIssue(
          "CHANNEX_SECRET_READ_FAILED",
          "Stored Channex secret could not be read. Poll skipped for this account.",
          { details: describeLocalError(error) }
        ),
      };
    }
  }

  async pollAccount({ integration, config, startedAt, aggregate }) {
    const accountId = requireStr(integration?.id);
    if (!allowlistIncludes(config.accountIds, accountId)) return;

    const accountResult = {
      integrationAccountId: accountId,
      userId: requireStr(integration?.userId),
      status: requireStr(integration?.status),
      result: "processed",
      propertiesChecked: 0,
      propertiesSkippedCount: 0,
      warnings: [],
      errors: [],
    };
    aggregate.accountResults.push(accountResult);

    if (String(integration?.status || "").toUpperCase() !== CHANNEX_STATUS.CONNECTED) {
      const warning = buildChannexPullIssue(
        "CHANNEX_ACCOUNT_NOT_CONNECTED",
        "Channex booking poll skipped because the integration account is not connected."
      );
      accountResult.result = "skipped";
      accountResult.warnings.push(warning);
      aggregate.warnings.push(warning);
      return;
    }

    if (!requireStr(integration?.credentialsRef)) {
      const warning = buildChannexPullIssue(
        "CHANNEX_RECONNECT_REQUIRED",
        "Channex booking poll skipped because credentials are missing."
      );
      accountResult.result = "skipped";
      accountResult.warnings.push(warning);
      aggregate.warnings.push(warning);
      return;
    }

    const secretResult = await this.readPollSecret(integration);
    if (!secretResult.ok) {
      accountResult.result = "skipped";
      accountResult.warnings.push(secretResult.warning);
      aggregate.warnings.push(secretResult.warning);
      return;
    }

    const propertyMappings = await this.props.listByAccountId(accountId);
    const activeMappings = (Array.isArray(propertyMappings) ? propertyMappings : []).filter(
      (mapping) =>
        isActiveChannexPropertyMapping(mapping) &&
        requireStr(mapping?.domitsPropertyId) &&
        requireStr(mapping?.externalPropertyId) &&
        allowlistIncludes(config.domitsPropertyIds, mapping.domitsPropertyId)
    );

    accountResult.propertiesChecked = activeMappings.length;
    aggregate.propertiesChecked += activeMappings.length;
    for (const propertyMapping of activeMappings) {
      await this.pollProperty({
        integration,
        propertyMapping,
        secret: secretResult.secret,
        config,
        startedAt,
        aggregate,
        accountResult,
      });
    }
  }

  async pollLatestChannexBookings(options = {}) {
    const startedAt = nowMs();
    const config = buildChannexBookingPollConfig(options);
    const aggregate = createEmptyChannexBookingPollResponse({
      enabled: config.enabled,
      trigger: config.trigger,
    });

    if (!config.enabled) {
      aggregate.notes = [
        "Automatic Channex booking polling is disabled. Set CHANNEX_BOOKING_POLL_ENABLED=true and keep the scheduled event enabled=true for staging polling.",
      ];
      return ok(aggregate);
    }

    try {
      if (!hasRequiredChannexBookingPollAllowlists(config)) {
        aggregate.overallSuccess = false;
        aggregate.warnings.push(
          buildChannexPullIssue(
            "CHANNEX_BOOKING_POLL_ALLOWLIST_REQUIRED",
            "Automatic Channex booking polling requires both account and Domits property allowlists before it will call Channex."
          )
        );
        aggregate.notes = [
          "Set CHANNEX_BOOKING_POLL_ACCOUNT_IDS and CHANNEX_BOOKING_POLL_DOMITS_PROPERTY_IDS before enabling scheduled polling.",
        ];
        return ok(aggregate);
      }

      const accounts = await this.accounts.listByChannel(CHANNEL_CHANNEX);
      aggregate.accountsChecked = Array.isArray(accounts) ? accounts.length : 0;
      for (const integration of Array.isArray(accounts) ? accounts : []) {
        await this.pollAccount({
          integration,
          config,
          startedAt,
          aggregate,
        });
      }
      aggregate.overallSuccess =
        aggregate.errors.length === 0 &&
        aggregate.warnings.length === 0 &&
        aggregate.unackedCount === 0 &&
        aggregate.propertiesSkippedCount === 0;
      return ok(aggregate);
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        ...aggregate,
        overallSuccess: false,
        errors: [
          ...aggregate.errors,
          buildChannexPullIssue(
            details.code || "CHANNEX_BOOKING_POLL_FAILED",
            details.message || "Channex booking poll failed.",
            { details }
          ),
        ],
      });
    }
  }
}
