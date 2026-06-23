import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import { CHANNEX_STATUS } from "../channelManagementConstants.js";
import ChannexCredentialStore from "../providers/channex/credentialStore.js";
import { hasChannexRequiredCredentialFields } from "../providers/channex/credentialUtils.js";
import ChannexProviderClient from "../providers/channex/providerClient.js";
import { parseIsoDateParam } from "../utils/channexAriDateUtils.js";
import {
  buildChannexAvailabilitySyncPayloads,
  buildChannexRestrictionSyncPayloads,
  combineChannexAvailabilitySyncPayloadsForProvider,
  combineChannexRestrictionSyncPayloadsForProvider,
  summarizeChannexGroupedPayloads,
} from "../utils/channexAriPayloadUtils.js";
import {
  addChannexRestrictionsSyncVersion,
  appendRestrictionSyncOutboundNotes,
  buildChannexSyncEvidencePatch,
  buildSyncDateRangeValidationFailure,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  deriveEvidenceOutcome,
  formatChannexAvailabilityProviderResult,
  formatChannexRestrictionProviderResult,
  getCaptureState,
  getInvalidRequestOrFailedStatus,
  logChannexRestrictionsSync,
  resultListHasErrors,
  summarizePayloadPreviewForEvidence,
  withOptionalDetails,
} from "../utils/channexAriExecutionUtils.js";
import {
  CHANNEX_RESTRICTIONS_SYNC_MODE,
  CHANNEX_RESTRICTIONS_SYNC_VERSION,
} from "../utils/channexRestrictionsSyncVersion.js";

const nowMs = () => Date.now();
const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});
const getUnavailableChannexStatus = (integration) =>
  integration ? CHANNEX_STATUS.DISCONNECTED : CHANNEX_STATUS.NOT_CONNECTED;

export default class ChannexAriExecutionService {
  constructor({
    accounts = new IntegrationAccountRepository(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
    finalizeChannexSyncResult,
    previewChannexAriPayloads,
    previewChannexAvailabilityPayloads,
    previewChannexRestrictionRatePayloads,
  } = {}) {
    this.accounts = accounts;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
    this.finalizeChannexSyncResult = finalizeChannexSyncResult;
    this.previewChannexAriPayloads = previewChannexAriPayloads;
    this.previewChannexAvailabilityPayloads = previewChannexAvailabilityPayloads;
    this.previewChannexRestrictionRatePayloads =
      previewChannexRestrictionRatePayloads;
  }

  buildChannexSyncCredentialFailure({
    response,
    integrationAccountId,
    mappingSnapshot,
    groupedPayloads,
    baseNotes,
    payloadPreview,
    errorCode,
    errorMessage,
    details = null,
  }) {
    return {
      ok: false,
      response,
      evidencePatch: {
        integrationAccountId,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: groupedPayloads,
        providerResponseSummary: { ready: true, calledProvider: false, results: [] },
        errors: [
          withOptionalDetails({ errorCode, errorMessage }, details),
        ],
        notes: baseNotes,
        rawDetails: { payloadPreview },
      },
    };
  }

  async resolveChannexSyncCredentialContext({
    userId,
    mappingSnapshot,
    groupedPayloads,
    baseNotes,
    payloadPreview,
  }) {
    const integration = await this.accounts.findByUserIdAndChannel(userId, "CHANNEX");
    if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: getUnavailableChannexStatus(integration),
        }),
        integrationAccountId: integration?.id ?? null,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_NOT_CONNECTED",
        errorMessage: "Channex integration is not connected for this user.",
      });
    }

    const credentialsRef = requireStr(integration.credentialsRef);
    if (!credentialsRef) {
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Channex credentials are missing. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
        integrationAccountId: integration.id,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_RECONNECT_REQUIRED",
        errorMessage: "Channex credentials are missing. Reconnect required.",
      });
    }

    let secret;
    try {
      secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
    } catch (error) {
      const details = describeLocalError(error);
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Stored Channex secret could not be read. Reconnect required.",
          errorCode: "CHANNEX_SECRET_READ_FAILED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          details,
        }),
        integrationAccountId: integration.id,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_SECRET_READ_FAILED",
        errorMessage: "Stored Channex secret could not be read. Reconnect required.",
        details,
      });
    }

    if (
      !secret ||
      typeof secret !== "object" ||
      Array.isArray(secret) ||
      !hasChannexRequiredCredentialFields(secret)
    ) {
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
          errorCode: "CHANNEX_SECRET_INVALID",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
        integrationAccountId: integration.id,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_SECRET_INVALID",
        errorMessage: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
      });
    }

    return {
      ok: true,
      integration,
      secret,
    };
  }

  createChannexSyncFinalizer({
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    rawDateFrom,
    rawDateTo,
    startedAt,
    syncType,
    options,
  }) {
    return async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType,
          dateFrom: normalizedDateFrom ?? requireStr(rawDateFrom),
          dateTo: normalizedDateTo ?? requireStr(rawDateTo),
          startedAt,
          evidencePatch,
        }),
        options
      );
  }

  buildChannexSyncPreviewFailureEvidencePatch(payloadPreviewResult, config) {
    const previewResponse = payloadPreviewResult?.response || {};
    return {
      status: getInvalidRequestOrFailedStatus(payloadPreviewResult?.statusCode),
      overallSuccess: false,
      mappingSnapshot: {
        missingMappings: Array.isArray(previewResponse.missingMappings) ? previewResponse.missingMappings : [],
        sourceSummary: previewResponse.sourceSummary ?? null,
      },
      groupedOutboundPayloadSnapshot: null,
      providerResponseSummary: null,
      errors: [
        {
          errorCode: previewResponse.errorCode ?? config.previewErrorCode,
          errorMessage: previewResponse.error ?? config.previewErrorMessage,
          details: previewResponse.details ?? null,
        },
      ],
      notes: [],
      rawDetails: {
        previewResult: payloadPreviewResult,
      },
    };
  }

  buildChannexSyncNotReadyResult({
    payloadPreview,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
  }) {
    const response = ok({
      channel: payloadPreview.channel || "CHANNEX",
      integrationAccountId: payloadPreview.integrationAccountId || null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      ready: false,
      calledProvider: false,
      requestCount: 0,
      results: [],
      notes: baseNotes,
      missingMappings: Array.isArray(payloadPreview.missingMappings) ? payloadPreview.missingMappings : [],
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: payloadPreview.integrationAccountId || null,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: [],
        providerResponseSummary: { ready: false, calledProvider: false, results: [] },
        taskIds: [],
        warnings: [],
        errors: [],
        notes: baseNotes,
        rawDetails: { payloadPreview },
      },
    };
  }

  buildChannexSyncNoopResult({
    payloadPreview,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
    noopNote,
  }) {
    const response = ok({
      channel: payloadPreview.channel || "CHANNEX",
      integrationAccountId: payloadPreview.integrationAccountId || null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      ready: true,
      calledProvider: false,
      requestCount: 0,
      results: [],
      notes: [...baseNotes, noopNote],
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: payloadPreview.integrationAccountId || null,
        status: "NOOP",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: [],
        providerResponseSummary: { ready: true, calledProvider: false, results: [] },
        taskIds: [],
        warnings: [],
        errors: [],
        notes: response.response.notes,
        rawDetails: { payloadPreview },
      },
    };
  }

  buildChannexSyncProviderResult({
    integration,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
    transformedPayloads,
    providerResult,
    formatProviderResult,
    payloadPreview,
    summarizeEvidencePayloads = false,
  }) {
    const results = Array.isArray(providerResult?.results) ? providerResult.results : [];
    const response = ok({
      channel: "CHANNEX",
      integrationAccountId: integration.id,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      ready: true,
      calledProvider: true,
      requestCount: transformedPayloads.length,
      results: results.map((result) => formatProviderResult(result)),
      notes: baseNotes,
    });
    const outcome = deriveEvidenceOutcome({
      statusCode: response.statusCode,
      ready: response.response.ready,
      calledProvider: response.response.calledProvider,
      results: response.response.results,
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: integration.id,
        status: outcome.status,
        overallSuccess: outcome.overallSuccess,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: summarizeEvidencePayloads
          ? summarizeChannexGroupedPayloads(transformedPayloads)
          : transformedPayloads,
        providerResponseSummary: {
          requestCount: transformedPayloads.length,
          results: response.response.results,
        },
        taskIds: collectTaskIdsFromResultList(response.response.results),
        warnings: collectWarningsFromResultList(response.response.results),
        errors: collectErrorsFromResultList(response.response.results),
        notes: baseNotes,
        rawDetails: {
          payloadPreview: summarizeEvidencePayloads
            ? summarizePayloadPreviewForEvidence(payloadPreview)
            : payloadPreview,
          providerResult: {
            success: !!providerResult?.success,
            resultCount: results.length,
            results: response.response.results,
            rawRequestBodiesOmitted: true,
          },
        },
      },
    };
  }

  logChannexPreviewPayloadSyncStage(stage, logContext, fields = {}) {
    if (!logContext) return;
    logChannexRestrictionsSync(stage, {
      ...logContext,
      ...fields,
    });
  }

  async resolveChannexPreviewPayloadResult({
    buildPayloadPreview,
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
  }) {
    if (typeof buildPayloadPreview === "function") {
      return await buildPayloadPreview(
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo
      );
    }

    return await this.previewChannexAriPayloads(
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo
    );
  }

  logChannexPreviewPayloadGenerated(logContext, payloadPreviewResult) {
    this.logChannexPreviewPayloadSyncStage("after_payload_generation", logContext, {
      statusCode: payloadPreviewResult?.statusCode ?? null,
      ready: payloadPreviewResult?.response?.ready ?? null,
      restrictionRatePayloadGroups: Array.isArray(
        payloadPreviewResult?.response?.restrictionRatePayloadPreview?.groupedPayloads
      )
        ? payloadPreviewResult.response.restrictionRatePayloadPreview.groupedPayloads.length
        : null,
      restrictionRatePayloadItems: Array.isArray(payloadPreviewResult?.response?.restrictionRatePayloadPreview?.items)
        ? payloadPreviewResult.response.restrictionRatePayloadPreview.items.length
        : null,
    });
  }

  buildChannexPreviewPayloadSyncMetadata(payloadPreview, baseNotes) {
    return {
      notes: [...(Array.isArray(payloadPreview.notes) ? payloadPreview.notes : []), ...baseNotes],
      mappingSnapshot: {
        missingMappings: Array.isArray(payloadPreview.missingMappings) ? payloadPreview.missingMappings : [],
        sourceSummary: payloadPreview.sourceSummary ?? null,
      },
    };
  }

  buildChannexPreviewSyncPayloads({ groupedPayloads, buildPayloads, afterBuildPayloads, notes }) {
    const transformedPayloads = buildPayloads(groupedPayloads);
    if (typeof afterBuildPayloads !== "function") return transformedPayloads;

    const nextTransformedPayloads = afterBuildPayloads({ baseNotes: notes, transformedPayloads });
    return Array.isArray(nextTransformedPayloads) ? nextTransformedPayloads : transformedPayloads;
  }

  captureChannexPreviewSyncPayloads({ captureState, summarizeEvidencePayloads, transformedPayloads }) {
    if (!captureState) return;
    captureState.groupedOutboundPayloadSnapshot = summarizeEvidencePayloads
      ? summarizeChannexGroupedPayloads(transformedPayloads)
      : transformedPayloads;
  }

  applyChannexPreviewProviderFailureStatus({
    providerSyncResult,
    providerFailureStatusCode,
    syncErrorCode,
    syncErrorMessage,
  }) {
    if (!providerFailureStatusCode || !resultListHasErrors(providerSyncResult.response?.response?.results)) return;
    providerSyncResult.response = bad(providerFailureStatusCode, {
      ...providerSyncResult.response.response,
      error: syncErrorMessage,
      errorCode: syncErrorCode,
    });
  }

  async runChannexPreviewPayloadSync({
    userId,
    domitsPropertyId,
    dateFrom,
    dateTo,
    options = {},
    syncType,
    baseNotes,
    previewErrorCode,
    previewErrorMessage,
    buildPayloadPreview = null,
    selectGroupedPayloads,
    buildPayloads,
    afterBuildPayloads = null,
    noopStage = "afterTransform",
    isNoop,
    noopNote,
    providerCall,
    formatProviderResult,
    syncErrorCode,
    syncErrorMessage,
    summarizeEvidencePayloads = false,
    providerFailureStatusCode = null,
    logContext = null,
  }) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);
    const captureState = getCaptureState(options);
    const finalize = this.createChannexSyncFinalizer({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      rawDateFrom: dateFrom,
      rawDateTo: dateTo,
      startedAt,
      syncType,
      options,
    });

    const validationFailure = buildSyncDateRangeValidationFailure({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationFailure) return await finalize(validationFailure.response, validationFailure.evidencePatch);

    try {
      this.logChannexPreviewPayloadSyncStage("before_payload_generation", logContext, {
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
      });
      const payloadPreviewResult = await this.resolveChannexPreviewPayloadResult({
        buildPayloadPreview,
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
      });
      this.logChannexPreviewPayloadGenerated(logContext, payloadPreviewResult);
      if (payloadPreviewResult?.statusCode !== 200) {
        return await finalize(
          payloadPreviewResult,
          this.buildChannexSyncPreviewFailureEvidencePatch(payloadPreviewResult, {
            previewErrorCode,
            previewErrorMessage,
          })
        );
      }

      const payloadPreview = payloadPreviewResult.response || {};
      const { notes, mappingSnapshot } = this.buildChannexPreviewPayloadSyncMetadata(payloadPreview, baseNotes);

      if (!payloadPreview.ready) {
        const notReady = this.buildChannexSyncNotReadyResult({
          payloadPreview,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes: notes,
          mappingSnapshot,
        });
        return await finalize(notReady.response, notReady.evidencePatch);
      }

      const groupedPayloads = selectGroupedPayloads(payloadPreview);

      if (noopStage === "beforeTransform" && isNoop({ groupedPayloads, transformedPayloads: [] })) {
        const noop = this.buildChannexSyncNoopResult({
          payloadPreview,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes: notes,
          mappingSnapshot,
          noopNote,
        });
        return await finalize(noop.response, noop.evidencePatch);
      }

      const transformedPayloads = this.buildChannexPreviewSyncPayloads({
        groupedPayloads,
        buildPayloads,
        afterBuildPayloads,
        notes,
      });
      this.captureChannexPreviewSyncPayloads({
        captureState,
        summarizeEvidencePayloads,
        transformedPayloads,
      });

      if (noopStage !== "beforeTransform" && isNoop({ groupedPayloads, transformedPayloads })) {
        const noop = this.buildChannexSyncNoopResult({
          payloadPreview,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes: notes,
          mappingSnapshot,
          noopNote,
        });
        return await finalize(noop.response, noop.evidencePatch);
      }

      const credentialContext = await this.resolveChannexSyncCredentialContext({
        userId: normalizedUserId,
        mappingSnapshot,
        groupedPayloads: summarizeEvidencePayloads
          ? summarizeChannexGroupedPayloads(transformedPayloads)
          : transformedPayloads,
        baseNotes: notes,
        payloadPreview: summarizeEvidencePayloads
          ? summarizePayloadPreviewForEvidence(payloadPreview)
          : payloadPreview,
      });
      if (!credentialContext.ok) {
        return await finalize(credentialContext.response, credentialContext.evidencePatch);
      }

      const { integration, secret } = credentialContext;
      const providerResult = await providerCall(secret, transformedPayloads);
      const providerSyncResult = this.buildChannexSyncProviderResult({
        integration,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        baseNotes: notes,
        mappingSnapshot,
        transformedPayloads,
        providerResult,
        formatProviderResult,
        payloadPreview,
        summarizeEvidencePayloads,
      });
      this.applyChannexPreviewProviderFailureStatus({
        providerSyncResult,
        providerFailureStatusCode,
        syncErrorCode,
        syncErrorMessage,
      });
      return await finalize(providerSyncResult.response, providerSyncResult.evidencePatch);
    } catch (error) {
      const details = describeLocalError(error);
      this.logChannexPreviewPayloadSyncStage("service_catch", logContext, {
        errorCode: syncErrorCode,
        details,
      });
      return await finalize(
        bad(500, {
          error: syncErrorMessage,
          errorCode: syncErrorCode,
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: syncErrorCode,
              errorMessage: syncErrorMessage,
              details,
            },
          ],
          rawDetails: { caughtError: details },
        }
      );
    }
  }

  async syncChannexAvailability(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    return this.runChannexPreviewPayloadSync({
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      options,
      syncType: "availability",
      baseNotes: [
        "Manual staging sync only. This endpoint sends availability updates directly and does not run a scheduler, retries, or sync-state persistence.",
        "Approved temporary availability mapping rule applied: Domits availability true => 1, false => 0.",
      ],
      previewErrorCode: "CHANNEX_AVAILABILITY_PREVIEW_FAILED",
      previewErrorMessage: "Failed to build availability payload preview.",
      buildPayloadPreview: (...args) => this.previewChannexAvailabilityPayloads(...args),
      selectGroupedPayloads: (payloadPreview) =>
        Array.isArray(payloadPreview?.availabilityPayloadPreview?.groupedPayloads)
          ? payloadPreview.availabilityPayloadPreview.groupedPayloads
          : [],
      buildPayloads: buildChannexAvailabilitySyncPayloads,
      afterBuildPayloads: ({ baseNotes, transformedPayloads }) => {
        const combinedPayloads = combineChannexAvailabilitySyncPayloadsForProvider(transformedPayloads);
        if (combinedPayloads.length) {
          baseNotes.push(
            `Availability sync combined ${transformedPayloads.length} room-type payload group(s) into one Channex availability request containing ${combinedPayloads[0].values.length} values.`
          );
        }
        return combinedPayloads;
      },
      noopStage: "beforeTransform",
      isNoop: ({ groupedPayloads }) => !groupedPayloads.length,
      noopNote: "No availability payload groups were generated, so nothing was sent to Channex.",
      providerCall: (secret, transformedPayloads) =>
        this.channexProviderClient.pushAvailability(secret, transformedPayloads, {
          requestTimeoutMs: options?.providerRequestTimeoutMs,
          stopOnFailure: true,
        }),
      formatProviderResult: formatChannexAvailabilityProviderResult,
      syncErrorCode: "CHANNEX_AVAILABILITY_SYNC_FAILED",
      syncErrorMessage: "Failed to sync Channex availability.",
      summarizeEvidencePayloads: true,
      providerFailureStatusCode: 500,
    });
  }

  async syncChannexRestrictions(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    logChannexRestrictionsSync("service_entry", {
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
    });

    try {
      const result = await this.runChannexPreviewPayloadSync({
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
        options,
        syncType: "restrictions",
        baseNotes: [
          "Manual staging sync only. This endpoint sends rate updates through Channex restrictions and does not run a scheduler, retries, or sync-state persistence.",
          "Restrictions sync sends Channex rate values and can add supported mapped fields: stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay.",
        ].filter(Boolean),
        previewErrorCode: "CHANNEX_RESTRICTIONS_PREVIEW_FAILED",
        previewErrorMessage: "Failed to build restrictions payload preview.",
        buildPayloadPreview: (...args) => this.previewChannexRestrictionRatePayloads(...args),
        selectGroupedPayloads: (payloadPreview) =>
          Array.isArray(payloadPreview?.restrictionRatePayloadPreview?.groupedPayloads)
            ? payloadPreview.restrictionRatePayloadPreview.groupedPayloads
            : [],
        buildPayloads: buildChannexRestrictionSyncPayloads,
        afterBuildPayloads: ({ baseNotes, transformedPayloads }) => {
          appendRestrictionSyncOutboundNotes(baseNotes, transformedPayloads);
          const combinedPayloads = combineChannexRestrictionSyncPayloadsForProvider(transformedPayloads);
          if (combinedPayloads.length) {
            baseNotes.push(
              `Restrictions sync combined ${transformedPayloads.length} rate-plan payload group(s) into one Channex restrictions request containing ${combinedPayloads[0].values.length} values.`
            );
            logChannexRestrictionsSync("after_request_planning", {
              sourceGroupCount: transformedPayloads.length,
              requestCount: combinedPayloads.length,
              totalValueCount: combinedPayloads.reduce(
                (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
                0
              ),
            });
          }
          return combinedPayloads;
        },
        isNoop: ({ transformedPayloads }) => !transformedPayloads.length,
        noopNote: "No nightlyPrice values or supported restriction fields were available to send, so nothing was posted to Channex.",
        providerCall: (secret, transformedPayloads) =>
          this.channexProviderClient.pushRestrictions(secret, transformedPayloads, {
            requestTimeoutMs: options?.providerRequestTimeoutMs,
            stopOnFailure: true,
          }),
        formatProviderResult: formatChannexRestrictionProviderResult,
        syncErrorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
        syncErrorMessage: "Failed to sync Channex restrictions.",
        summarizeEvidencePayloads: true,
        providerFailureStatusCode: 500,
        logContext: {
          action: "syncChannexRestrictions",
        },
      });

      return addChannexRestrictionsSyncVersion(result);
    } catch (error) {
      const details = describeLocalError(error);
      logChannexRestrictionsSync("service_outer_catch", {
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
        details,
      });
      return bad(500, {
        restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
        restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
        error: "Failed to sync Channex restrictions.",
        errorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
        details,
      });
    }
  }

}
