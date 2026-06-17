import {
  CHANNEX_CERTIFICATION_FULL_SYNC_DAYS,
  CHANNEX_FULL_SYNC_DEFAULTS,
  countInclusiveIsoDateRangeDays,
  summarizeChannexGroupedPayloads,
} from "../utils/channexAriPayloadUtils.js";
import {
  buildChannexSyncEvidencePatch,
  buildSyncDateRangeValidationFailure,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  dedupeByJson,
  formatChannexAvailabilityProviderResult,
  formatChannexRestrictionProviderResult,
  getCombinedSyncStatus,
  resultListHasErrors,
} from "../utils/channexAriExecutionUtils.js";

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
const summarizeErrorStack = (error) =>
  requireStr(error?.stack)
    ?.split("\n")
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];
const CHANNEX_FULL_SYNC_PROVIDER_MODES = new Set(["both", "availabilityOnly", "restrictionsOnly"]);
const CHANNEX_FULL_SYNC_DEBUG_STAGES = new Set([
  "validateOnly",
  "mappingsOnly",
  "availabilityPayloadOnly",
  "restrictionsPayloadOnly",
  "evidenceOnly",
]);
const parseBooleanQueryParam = (value) => String(value || "").trim().toLowerCase() === "true";
const normalizeChannexFullSyncProviderMode = (value) => {
  const normalized = requireStr(value) || "both";
  return CHANNEX_FULL_SYNC_PROVIDER_MODES.has(normalized) ? normalized : null;
};
const normalizeChannexFullSyncDebugStage = (value) => {
  const normalized = requireStr(value);
  if (!normalized) return null;
  return CHANNEX_FULL_SYNC_DEBUG_STAGES.has(normalized) ? normalized : "INVALID";
};
const buildChannexFullSyncErrorDetails = (stage, error) => ({
  stage,
  errorName: error?.name ?? null,
  errorMessage: error?.message ?? "Unhandled Channex full certification sync error.",
  details: describeLocalError(error),
  stackSummary: summarizeErrorStack(error),
});
const createCertificationFullSyncBaseNotes = (usingDefaultDateRange) => {
  const notes = [
    "Manual staging certification-prep runner only. This endpoint executes exactly one availability sync request and one restrictions/rates sync request for the selected full range.",
    "Restrictions sync sends rate values and can include mapped stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay fields when supported Domits calendar/global restrictions are present.",
    "Domits currently maps minimum stay to Channex min_stay_through only; min_stay_arrival is not claimed by this backend because Domits has no separate safe arrival-based minimum-stay source field.",
  ];
  if (usingDefaultDateRange) {
    notes.push(
      `No explicit date range was supplied, so the certification full-sync used ${CHANNEX_CERTIFICATION_FULL_SYNC_DAYS}-day UTC date range starting from today.`
    );
  }
  return notes;
};

export default class ChannexFullSyncService {
  constructor({
    channexProviderClient,
    normalizeChannexFullSyncDateContext,
    buildChannexFullSyncPayloadContext,
    buildChannexFullSyncAvailabilityPayloadContext,
    buildChannexFullSyncRestrictionsPayloadContext,
    finalizeChannexSyncResult,
    getChannexAriTargets,
    buildChannexAriTargetsFailureEvidencePatch,
    buildChannexMultiStepMappingSnapshot,
    buildBlockedChannexMultiStepSyncResult,
    resolveChannexSyncCredentialContext,
    logChannexFullCertificationSync,
  }) {
    this.channexProviderClient = channexProviderClient;
    this.normalizeChannexFullSyncDateContext = normalizeChannexFullSyncDateContext;
    this.buildChannexFullSyncPayloadContext = buildChannexFullSyncPayloadContext;
    this.buildChannexFullSyncAvailabilityPayloadContext = buildChannexFullSyncAvailabilityPayloadContext;
    this.buildChannexFullSyncRestrictionsPayloadContext = buildChannexFullSyncRestrictionsPayloadContext;
    this.finalizeChannexSyncResult = finalizeChannexSyncResult;
    this.getChannexAriTargets = getChannexAriTargets;
    this.buildChannexAriTargetsFailureEvidencePatch = buildChannexAriTargetsFailureEvidencePatch;
    this.buildChannexMultiStepMappingSnapshot = buildChannexMultiStepMappingSnapshot;
    this.buildBlockedChannexMultiStepSyncResult = buildBlockedChannexMultiStepSyncResult;
    this.resolveChannexSyncCredentialContext = resolveChannexSyncCredentialContext;
    this.logChannexFullCertificationSync = logChannexFullCertificationSync;
  }

  buildChannexFullSyncBaseResponse({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    stage,
  }) {
    return {
      channel: readiness?.channel || "CHANNEX",
      integrationAccountId: readiness?.integrationAccountId ?? null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
      stage,
      usedDefaultDateRange: !!usingDefaultDateRange,
      dryRun: dryRun === true,
      providerMode,
    };
  }

  async callChannexFullSyncProviderStep({ step, secret, payloads }) {
    this.logChannexFullCertificationSync(`${step}_provider_call_start`, {
      providerRequestTimeoutMs: CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS,
      requestCount: Array.isArray(payloads) ? payloads.length : 0,
      payloadSummary: summarizeChannexGroupedPayloads(payloads),
    });

    const providerResult =
      step === "availability"
        ? await this.channexProviderClient.pushAvailability(secret, payloads, {
            requestTimeoutMs: CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS,
            stopOnFailure: true,
          })
        : await this.channexProviderClient.pushRestrictions(secret, payloads, {
            requestTimeoutMs: CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS,
            stopOnFailure: true,
          });
    const rawResults = Array.isArray(providerResult?.results) ? providerResult.results : [];
    const results =
      step === "availability"
        ? rawResults.map((result) => formatChannexAvailabilityProviderResult(result))
        : rawResults.map((result) => formatChannexRestrictionProviderResult(result));

    this.logChannexFullCertificationSync(`${step}_provider_call_end`, {
      success: !!providerResult?.success,
      resultCount: results.length,
      taskIds: collectTaskIdsFromResultList(results),
      warnings: collectWarningsFromResultList(results),
      errors: collectErrorsFromResultList(results),
    });

    return {
      step,
      calledProvider: true,
      requestCount: Array.isArray(payloads) ? payloads.length : 0,
      success: !resultListHasErrors(results),
      taskIds: collectTaskIdsFromResultList(results),
      warnings: collectWarningsFromResultList(results),
      errors: collectErrorsFromResultList(results),
      results,
      providerResultSummary: {
        success: !!providerResult?.success,
        resultCount: rawResults.length,
        rawRequestBodiesOmitted: true,
      },
    };
  }

  buildChannexFullSyncProviderPlan({ providerMode, availabilityPayloads, restrictionPayloads }) {
    const plan = [];
    if (providerMode !== "restrictionsOnly") {
      plan.push({
        step: "availability",
        payloads: availabilityPayloads,
        emptyReason: "No availability values were generated for the requested certification full-sync range.",
      });
    }
    if (providerMode !== "availabilityOnly") {
      plan.push({
        step: "restrictions",
        payloads: restrictionPayloads,
        emptyReason: "No rate or supported restriction values were generated for the requested certification full-sync range.",
      });
    }
    return plan;
  }

  async finalizeInvalidChannexFullSyncOptions({
    providerMode,
    rawProviderMode,
    debugStage,
    rawDebugStage,
    dryRun,
    stageLog,
    finalize,
  }) {
    if (!providerMode) {
      return await finalize(
        bad(400, {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_failed",
          error: "Invalid query param: providerMode.",
          errorCode: "CHANNEX_FULL_SYNC_INVALID_PROVIDER_MODE",
          supportedProviderModes: Array.from(CHANNEX_FULL_SYNC_PROVIDER_MODES),
        }),
        {
          status: "INVALID_REQUEST",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_FULL_SYNC_INVALID_PROVIDER_MODE",
              errorMessage: "Invalid query param: providerMode.",
            },
          ],
          rawDetails: { dryRun, providerMode: rawProviderMode ?? null, debugStage, stageLog },
        }
      );
    }

    if (debugStage === "INVALID") {
      return await finalize(
        bad(400, {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_failed",
          error: "Invalid query param: debugStage.",
          errorCode: "CHANNEX_FULL_SYNC_INVALID_DEBUG_STAGE",
          supportedDebugStages: Array.from(CHANNEX_FULL_SYNC_DEBUG_STAGES),
        }),
        {
          status: "INVALID_REQUEST",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_FULL_SYNC_INVALID_DEBUG_STAGE",
              errorMessage: "Invalid query param: debugStage.",
            },
          ],
          rawDetails: { dryRun, providerMode, debugStage: rawDebugStage ?? null, stageLog },
        }
      );
    }

    return null;
  }

  async finalizeChannexFullSyncDateValidationFailure({
    validationFailure,
    dryRun,
    providerMode,
    debugStage,
    usingDefaultDateRange,
    stageLog,
    mark,
    finalize,
  }) {
    if (!validationFailure) return null;
    mark("validation_failed", {
      errorCode: validationFailure.evidencePatch?.errors?.[0]?.errorCode ?? null,
    });
    return await finalize(
      {
        ...validationFailure.response,
        response: {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_failed",
          dryRun,
          providerMode,
          debugStage,
          ...validationFailure.response.response,
        },
      },
      {
        ...validationFailure.evidencePatch,
        rawDetails: {
          dryRun,
          providerMode,
          debugStage,
          usedDefaultDateRange: usingDefaultDateRange,
          stageLog,
        },
      }
    );
  }

  async finalizeChannexFullSyncEarlyDebugStage({
    debugStage,
    dryRun,
    providerMode,
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    stageLog,
    mark,
    finalize,
  }) {
    if (debugStage === "validateOnly") {
      return await finalize(
        ok({
          ok: true,
          route: "sync/full",
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_passed",
          debugStage,
          dryRun,
          providerMode,
          userId: normalizedUserId,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          selectedDays: countInclusiveIsoDateRangeDays(normalizedDateFrom, normalizedDateTo),
          calledProvider: false,
          requestCount: 0,
          debug: { stages: stageLog },
        }),
        {
          status: "DEBUG",
          overallSuccess: true,
          rawDetails: { debugStage, dryRun, providerMode, stageLog },
        }
      );
    }

    if (debugStage === "evidenceOnly") {
      mark("evidence_only_response_ready");
      return await finalize(
        ok({
          ok: true,
          route: "sync/full",
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "evidence_only_response_ready",
          debugStage,
          dryRun,
          providerMode,
          userId: normalizedUserId,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          calledProvider: false,
          requestCount: 0,
          debug: { stages: stageLog },
        }),
        {
          status: "DEBUG",
          overallSuccess: true,
          notes: ["debugStage=evidenceOnly: persisted a minimal full-sync debug evidence record only."],
          rawDetails: { debugStage, dryRun, providerMode, stageLog },
        }
      );
    }

    return null;
  }

  buildChannexFullSyncNotes({ usingDefaultDateRange, dryRun, debugStage, providerMode }) {
    const baseNotes = createCertificationFullSyncBaseNotes(usingDefaultDateRange);
    baseNotes.push(
      `Full certification sync runtime marker: ${CHANNEX_FULL_SYNC_DEFAULTS.VERSION}.`,
      `Real non-debug full sync sends exactly one availability request and one rates/restrictions request to Channex when both payloads contain values.`,
      `Provider requests use a controlled ${CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS} ms timeout so slow Channex responses return JSON instead of hanging the API request.`
    );
    if (dryRun) {
      baseNotes.push("dryRun=true: payloads are built and summarized, but no Channex provider request is sent.");
    }
    if (debugStage) {
      baseNotes.push(`debugStage=${debugStage}: endpoint returns after the requested diagnostic stage.`);
    }
    if (providerMode !== "both") {
      baseNotes.push(`providerMode=${providerMode}: only the selected provider step is executed for live isolation.`);
    }
    return baseNotes;
  }

  async loadChannexFullSyncReadinessContext({
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    debugStage,
    stageLog,
    mark,
    finalize,
  }) {
    const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
    if (readinessResult?.statusCode !== 200) {
      mark("mappings_failed", { statusCode: readinessResult?.statusCode ?? null });
      return {
        finalized: await finalize(
          {
            ...readinessResult,
            response: {
              fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
              stage: "mappings_failed",
              dryRun,
              providerMode,
              debugStage,
              ...(readinessResult?.response ?? undefined),
            },
          },
          {
            ...this.buildChannexAriTargetsFailureEvidencePatch(readinessResult),
            rawDetails: {
              readinessResult,
              dryRun,
              providerMode,
              debugStage,
              stageLog,
            },
          }
        ),
      };
    }

    const readiness = readinessResult.response || {};
    const mappingSnapshot = this.buildChannexMultiStepMappingSnapshot(readiness);
    const baseNotes = this.buildChannexFullSyncNotes({ usingDefaultDateRange, dryRun, debugStage, providerMode });
    mark("mappings_loaded", {
      ready: !!readiness.ready,
      integrationAccountId: readiness.integrationAccountId ?? null,
      roomTypeMappingCount: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings.length : 0,
      ratePlanMappingCount: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings.length : 0,
    });

    return { readiness, mappingSnapshot, baseNotes };
  }

  async finalizeChannexFullSyncMappingsOnlyDebug({
    debugStage,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    mappingSnapshot,
    baseNotes,
    stageLog,
    finalize,
  }) {
    if (debugStage !== "mappingsOnly") return null;
    return await finalize(
      ok({
        ...this.buildChannexFullSyncBaseResponse({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          usingDefaultDateRange,
          dryRun,
          providerMode,
          stage: "mappings_loaded",
        }),
        ok: true,
        debugStage,
        ready: !!readiness.ready,
        calledProvider: false,
        requestCount: 0,
        mappingSnapshot,
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        debug: { stages: stageLog },
      }),
      {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "DEBUG",
        overallSuccess: true,
        mappingSnapshot,
        notes: baseNotes,
        rawDetails: { debugStage, dryRun, providerMode, stageLog },
      }
    );
  }

  async finalizeBlockedChannexFullSyncReadiness({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    debugStage,
    mappingSnapshot,
    baseNotes,
    dateContext,
    stageLog,
    finalize,
  }) {
    if (readiness.ready) return null;
    const blocked = this.buildBlockedChannexMultiStepSyncResult({
      readiness,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      baseNotes,
      mappingSnapshot,
      config: {
        includeCombinedFieldsInBlockedResponse: true,
        getBlockedResponseFieldsBeforeReady: () => ({
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "mappings_loaded",
          usedDefaultDateRange: usingDefaultDateRange,
          dryRun,
          providerMode,
          debugStage,
        }),
        getBlockedResponseFieldsAfterReady: () => ({ blocked: true }),
      },
      dateContext,
    });
    return await finalize(blocked.response, {
      ...blocked.evidencePatch,
      rawDetails: {
        readiness: {
          ready: readiness.ready,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        },
        dryRun,
        providerMode,
        debugStage,
        stageLog,
      },
    });
  }

  async finalizeChannexFullSyncPayloadOnlyDebug({
    debugStage,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    mappingSnapshot,
    baseNotes,
    stageLog,
    mark,
    finalize,
  }) {
    if (debugStage === "availabilityPayloadOnly") {
      mark("before_availability_payload_generation");
      const availabilityPayloadContext = await this.buildChannexFullSyncAvailabilityPayloadContext({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
      });
      mark("availability_payload_built", {
        itemCount: availabilityPayloadContext.availabilityItems.length,
        sourceGroupCount: availabilityPayloadContext.availabilityGroupedPayloads.length,
        requestCount: availabilityPayloadContext.availabilityProviderPayloads.length,
        valueCount: availabilityPayloadContext.availabilityProviderPayloads.reduce(
          (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
          0
        ),
      });
      return await finalize(
        ok({
          ...this.buildChannexFullSyncBaseResponse({
            readiness,
            normalizedDomitsPropertyId,
            normalizedDateFrom,
            normalizedDateTo,
            usingDefaultDateRange,
            dryRun,
            providerMode,
            stage: "availability_payload_built",
          }),
          ok: true,
          debugStage,
          ready: true,
          calledProvider: false,
          requestCount: 0,
          payloadSummaries: {
            availability: availabilityPayloadContext.availabilityPayloadSummary,
            restrictions: null,
          },
          debug: {
            payloadsOmitted: true,
            stages: stageLog,
          },
        }),
        {
          integrationAccountId: readiness.integrationAccountId ?? null,
          status: "DEBUG",
          overallSuccess: true,
          mappingSnapshot,
          groupedOutboundPayloadSnapshot: {
            availability: availabilityPayloadContext.availabilityPayloadSummary,
            restrictions: null,
          },
          notes: baseNotes,
          rawDetails: { debugStage, dryRun, providerMode, payloadsOmitted: true, stageLog },
        }
      );
    }

    if (debugStage !== "restrictionsPayloadOnly") return null;
    mark("before_restrictions_payload_generation");
    const restrictionsPayloadContext = await this.buildChannexFullSyncRestrictionsPayloadContext({
      readiness,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      markStage: mark,
    });
    mark("restrictions_payload_built", {
      itemCount: restrictionsPayloadContext.restrictionRateItems.length,
      sourceGroupCount: restrictionsPayloadContext.restrictionRateGroupedPayloads.length,
      requestCount: restrictionsPayloadContext.restrictionProviderPayloads.length,
      valueCount: restrictionsPayloadContext.restrictionProviderPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
      sentChannexRestrictionFields: restrictionsPayloadContext.sentChannexRestrictionFields,
    });
    return await finalize(
      ok({
        ...this.buildChannexFullSyncBaseResponse({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          usingDefaultDateRange,
          dryRun,
          providerMode,
          stage: "restrictions_payload_built",
        }),
        ok: true,
        debugStage,
        ready: true,
        calledProvider: false,
        requestCount: 0,
        payloadSummaries: {
          availability: null,
          restrictions: restrictionsPayloadContext.restrictionsPayloadSummary,
        },
        sentChannexRestrictionFields: restrictionsPayloadContext.sentChannexRestrictionFields,
        debug: {
          payloadsOmitted: true,
          stages: stageLog,
        },
      }),
      {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "DEBUG",
        overallSuccess: true,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: null,
          restrictions: restrictionsPayloadContext.restrictionsPayloadSummary,
        },
        notes: baseNotes,
        rawDetails: { debugStage, dryRun, providerMode, payloadsOmitted: true, stageLog },
      }
    );
  }

  markChannexFullSyncPayloadContextBuilt({ payloadContext, availabilityPayloads, restrictionPayloads, baseNotes, mark }) {
    mark("availability_payload_built", {
      itemCount: payloadContext.availabilityItems.length,
      sourceGroupCount: payloadContext.availabilityGroupedPayloads.length,
      requestCount: availabilityPayloads.length,
      valueCount: availabilityPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
    });
    mark("restrictions_payload_built", {
      itemCount: payloadContext.restrictionRateItems.length,
      sourceGroupCount: payloadContext.restrictionRateGroupedPayloads.length,
      requestCount: restrictionPayloads.length,
      valueCount: restrictionPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
      sentChannexRestrictionFields: payloadContext.sentChannexRestrictionFields,
    });
    if (payloadContext.sentChannexRestrictionFields.length) {
      baseNotes.push(
        `Full sync rates/restrictions payload includes supported Channex fields when values exist: ${payloadContext.sentChannexRestrictionFields.join(", ")}.`
      );
      return;
    }
    baseNotes.push(
      "Full sync rates/restrictions payload is rate-only because no supported restriction values were available in the selected range."
    );
  }

  async finalizeChannexFullSyncPreProviderResult({
    providerPlan,
    payloadSummaries,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    mappingSnapshot,
    baseNotes,
    stageLog,
    mark,
    finalize,
  }) {
    const emptyPlanItems = providerPlan.filter((item) => !Array.isArray(item.payloads) || item.payloads.length === 0);
    if (emptyPlanItems.length) {
      mark("payload_validation_failed", {
        missingSteps: emptyPlanItems.map((item) => item.step),
      });
      const errors = emptyPlanItems.map((item) => ({
        errorCode: `CHANNEX_FULL_SYNC_${item.step.toUpperCase()}_PAYLOAD_EMPTY`,
        errorMessage: item.emptyReason,
      }));
      const response = bad(409, {
        ...this.buildChannexFullSyncBaseResponse({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          usingDefaultDateRange,
          dryRun,
          providerMode,
          stage: "payload_validation_failed",
        }),
        ready: true,
        blocked: true,
        calledProvider: false,
        requestCount: 0,
        plannedRequestCount: providerPlan.length,
        taskIds: [],
        warnings: [],
        errors,
        payloadSummaries,
        overallSuccess: false,
        notes: baseNotes,
        debug: {
          payloadsOmitted: true,
          stages: stageLog,
        },
      });
      return await finalize(response, {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: payloadSummaries,
        providerResponseSummary: {
          calledProvider: false,
          requestCount: 0,
          plannedRequestCount: providerPlan.length,
          dryRun,
          providerMode,
        },
        taskIds: [],
        warnings: [],
        errors,
        notes: baseNotes,
        rawDetails: {
          dryRun,
          providerMode,
          payloadsOmitted: true,
          stageLog,
        },
      });
    }

    if (!dryRun) return null;
    mark("dry_run_response_ready", { plannedRequestCount: providerPlan.length });
    const response = ok({
      ...this.buildChannexFullSyncBaseResponse({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        stage: "dry_run_response_ready",
      }),
      ready: true,
      blocked: false,
      calledProvider: false,
      requestCount: 0,
      plannedRequestCount: providerPlan.length,
      taskIds: [],
      warnings: [],
      errors: [],
      payloadSummaries,
      steps: {
        availability: null,
        restrictions: null,
      },
      overallSuccess: true,
      notes: baseNotes,
      debug: {
        payloadsOmitted: true,
        stages: stageLog,
      },
    });
    return await finalize(response, {
      integrationAccountId: readiness.integrationAccountId ?? null,
      status: "DRY_RUN",
      overallSuccess: true,
      mappingSnapshot,
      groupedOutboundPayloadSnapshot: payloadSummaries,
      providerResponseSummary: {
        calledProvider: false,
        requestCount: 0,
        plannedRequestCount: providerPlan.length,
        dryRun: true,
        providerMode,
      },
      taskIds: [],
      warnings: [],
      errors: [],
      notes: baseNotes,
      rawDetails: {
        dryRun: true,
        providerMode,
        payloadsOmitted: true,
        stageLog,
      },
    });
  }

  async finalizeChannexFullSyncCredentialFailure({
    credentialContext,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    payloadSummaries,
    stageLog,
    mark,
    finalize,
  }) {
    if (credentialContext.ok) return null;
    mark("credentials_load_failed", {
      statusCode: credentialContext.response?.statusCode ?? null,
    });
    return await finalize(
      {
        ...credentialContext.response,
        response: {
          ...this.buildChannexFullSyncBaseResponse({
            readiness,
            normalizedDomitsPropertyId,
            normalizedDateFrom,
            normalizedDateTo,
            usingDefaultDateRange,
            dryRun,
            providerMode,
            stage: "credentials_load_failed",
          }),
          ...(credentialContext.response?.response ?? undefined),
          ready: true,
          calledProvider: false,
          requestCount: 0,
          payloadSummaries,
          debug: {
            payloadsOmitted: true,
            stages: stageLog,
          },
        },
      },
      {
        ...credentialContext.evidencePatch,
        groupedOutboundPayloadSnapshot: payloadSummaries,
        rawDetails: {
          dryRun,
          providerMode,
          payloadsOmitted: true,
          stageLog,
        },
      }
    );
  }

  buildChannexFullSyncStepSummary(step) {
    if (!step) return null;
    return {
      calledProvider: step.calledProvider,
      requestCount: step.requestCount,
      taskIds: step.taskIds,
      warnings: step.warnings,
      errors: step.errors,
    };
  }

  async finalizeChannexFullSyncProviderSteps({
    providerPlan,
    credentialContext,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    payloadSummaries,
    mappingSnapshot,
    baseNotes,
    stageLog,
    mark,
    finalize,
  }) {
    mark("credentials_loaded", {
      integrationAccountId: credentialContext.integration?.id ?? null,
    });
    mark("provider_calls_start", {
      requestCount: providerPlan.length,
    });
    const providerSteps = await Promise.all(
      providerPlan.map((item) =>
        this.callChannexFullSyncProviderStep({
          step: item.step,
          secret: credentialContext.secret,
          payloads: item.payloads,
        })
      )
    );
    mark("provider_calls_complete", {
      requestCount: providerSteps.reduce((sum, item) => sum + item.requestCount, 0),
      taskIds: dedupeByJson(providerSteps.flatMap((item) => item.taskIds)),
    });

    const availabilityStep = providerSteps.find((item) => item.step === "availability") ?? null;
    const restrictionsStep = providerSteps.find((item) => item.step === "restrictions") ?? null;
    const combinedTaskIds = dedupeByJson(providerSteps.flatMap((item) => item.taskIds));
    const combinedWarnings = dedupeByJson(providerSteps.flatMap((item) => item.warnings));
    const combinedErrors = dedupeByJson(providerSteps.flatMap((item) => item.errors));
    const requestCount = providerSteps.reduce((sum, item) => sum + item.requestCount, 0);
    const calledProvider = requestCount > 0;
    const overallSuccess =
      calledProvider &&
      combinedWarnings.length === 0 &&
      combinedErrors.length === 0 &&
      providerSteps.every((item) => item.success);
    const responseStage = combinedErrors.length ? "provider_completed_with_errors" : "response_ready";
    const responseBody = {
      ...this.buildChannexFullSyncBaseResponse({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        stage: responseStage,
      }),
      ready: true,
      blocked: false,
      calledProvider,
      requestCount,
      taskIds: combinedTaskIds,
      warnings: combinedWarnings,
      errors: combinedErrors,
      payloadSummaries,
      steps: {
        availability: availabilityStep,
        restrictions: restrictionsStep,
      },
      overallSuccess,
      notes: baseNotes,
      debug: {
        payloadsOmitted: true,
        stages: stageLog,
      },
    };
    const response = combinedErrors.length
      ? bad(500, {
          ...responseBody,
          error: "Channex certification full sync provider step failed.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_PROVIDER_FAILED",
        })
      : ok(responseBody);

    return await finalize(response, {
      integrationAccountId: credentialContext.integration.id,
      status: getCombinedSyncStatus({
        overallSuccess,
        providerCalled: calledProvider,
        combinedErrors,
        combinedWarnings,
        blockNoProviderWithErrors: true,
      }),
      overallSuccess,
      mappingSnapshot,
      groupedOutboundPayloadSnapshot: payloadSummaries,
      providerResponseSummary: {
        calledProvider,
        requestCount,
        dryRun,
        providerMode,
        steps: {
          availability: this.buildChannexFullSyncStepSummary(availabilityStep),
          restrictions: this.buildChannexFullSyncStepSummary(restrictionsStep),
        },
      },
      taskIds: combinedTaskIds,
      warnings: combinedWarnings,
      errors: combinedErrors,
      notes: baseNotes,
      rawDetails: {
        dryRun,
        providerMode,
        payloadsOmitted: true,
        stageLog,
        providerResultSummaries: providerSteps.map((item) => ({
          step: item.step,
          ...item.providerResultSummary,
        })),
      },
    });
  }

  async syncChannexFull(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    const startedAt = nowMs();
    let stage = "service_entry";
    const stageLog = [];
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const dateContext = this.normalizeChannexFullSyncDateContext(dateFrom, dateTo);
    const { rawDateFrom, rawDateTo, usingDefaultDateRange, normalizedDateFrom, normalizedDateTo } = dateContext;
    const dryRun = parseBooleanQueryParam(options?.dryRun);
    const providerMode = normalizeChannexFullSyncProviderMode(options?.providerMode);
    const debugStage = normalizeChannexFullSyncDebugStage(options?.debugStage);
    const persistEvidence = parseBooleanQueryParam(options?.persistEvidence);
    const mark = (nextStage, fields = {}) => {
      stage = nextStage;
      const elapsedMs = nowMs() - startedAt;
      const entry = {
        stage: nextStage,
        at: nowMs(),
        elapsedMs,
        ...fields,
      };
      stageLog.push(entry);
      this.logChannexFullCertificationSync(nextStage, {
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom ?? rawDateFrom,
        dateTo: normalizedDateTo ?? rawDateTo,
        dryRun,
        providerMode,
        debugStage,
        elapsedMs,
        ...fields,
      });
    };
    const finalize = async (result, evidencePatch = {}) => {
      const skipEvidence =
        options?.skipEvidence === true ||
        ((dryRun || debugStage) && debugStage !== "evidenceOnly" && !persistEvidence);
      mark("evidence_persist_start", { statusCode: result?.statusCode ?? null, skipEvidence });
      const finalized = await this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: "certification_full",
          dateFrom: normalizedDateFrom ?? rawDateFrom,
          dateTo: normalizedDateTo ?? rawDateTo,
          startedAt,
          evidencePatch,
        }),
        {
          ...options,
          skipEvidence,
        }
      );
      mark("evidence_persisted", {
        evidencePersisted: finalized?.response?.evidencePersisted ?? null,
        evidenceId: finalized?.response?.evidenceId ?? null,
      });
      mark("response_returned", { statusCode: finalized?.statusCode ?? null });
      return finalized;
    };

    mark("service_entry");

    const invalidOptionResult = await this.finalizeInvalidChannexFullSyncOptions({
      providerMode,
      rawProviderMode: options?.providerMode,
      debugStage,
      rawDebugStage: options?.debugStage,
      dryRun,
      stageLog,
      finalize,
    });
    if (invalidOptionResult) return invalidOptionResult;

    const validationFailure = buildSyncDateRangeValidationFailure({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      rawDateFrom,
      rawDateTo,
      requireCompleteDatePair: true,
      usingDefaultDateRange,
    });
    const validationResult = await this.finalizeChannexFullSyncDateValidationFailure({
      validationFailure,
      dryRun,
      providerMode,
      debugStage,
      usingDefaultDateRange,
      stageLog,
      mark,
      finalize,
    });
    if (validationResult) return validationResult;

    try {
      mark("validation_passed", {
        selectedDays: countInclusiveIsoDateRangeDays(normalizedDateFrom, normalizedDateTo),
      });
      const earlyDebugResult = await this.finalizeChannexFullSyncEarlyDebugStage({
        debugStage,
        dryRun,
        providerMode,
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        stageLog,
        mark,
        finalize,
      });
      if (earlyDebugResult) return earlyDebugResult;

      const readinessContext = await this.loadChannexFullSyncReadinessContext({
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        debugStage,
        stageLog,
        mark,
        finalize,
      });
      if (readinessContext.finalized) return readinessContext.finalized;

      const { readiness, mappingSnapshot, baseNotes } = readinessContext;

      const mappingsOnlyResult = await this.finalizeChannexFullSyncMappingsOnlyDebug({
        debugStage,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        mappingSnapshot,
        baseNotes,
        stageLog,
        finalize,
      });
      if (mappingsOnlyResult) return mappingsOnlyResult;

      const blockedReadinessResult = await this.finalizeBlockedChannexFullSyncReadiness({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        debugStage,
        mappingSnapshot,
        baseNotes,
        dateContext,
        stageLog,
        finalize,
      });
      if (blockedReadinessResult) return blockedReadinessResult;

      const payloadOnlyResult = await this.finalizeChannexFullSyncPayloadOnlyDebug({
        debugStage,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        mappingSnapshot,
        baseNotes,
        stageLog,
        mark,
        finalize,
      });
      if (payloadOnlyResult) return payloadOnlyResult;

      mark("before_payload_generation");
      const payloadContext = await this.buildChannexFullSyncPayloadContext({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
      });
      const availabilityPayloads = payloadContext.availabilityProviderPayloads;
      const restrictionPayloads = payloadContext.restrictionProviderPayloads;
      const payloadSummaries = {
        availability: payloadContext.availabilityPayloadSummary,
        restrictions: payloadContext.restrictionsPayloadSummary,
      };

      this.markChannexFullSyncPayloadContextBuilt({
        payloadContext,
        availabilityPayloads,
        restrictionPayloads,
        baseNotes,
        mark,
      });

      const providerPlan = this.buildChannexFullSyncProviderPlan({
        providerMode,
        availabilityPayloads,
        restrictionPayloads,
      });
      const preProviderResult = await this.finalizeChannexFullSyncPreProviderResult({
        providerPlan,
        payloadSummaries,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        mappingSnapshot,
        baseNotes,
        stageLog,
        mark,
        finalize,
      });
      if (preProviderResult) return preProviderResult;

      mark("credentials_load_start");
      const credentialContext = await this.resolveChannexSyncCredentialContext({
        userId: normalizedUserId,
        mappingSnapshot,
        groupedPayloads: payloadSummaries,
        baseNotes,
        payloadPreview: {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          dryRun,
          providerMode,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          payloadSummaries,
          payloadsOmitted: true,
        },
      });
      const credentialFailureResult = await this.finalizeChannexFullSyncCredentialFailure({
        credentialContext,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        payloadSummaries,
        stageLog,
        mark,
        finalize,
      });
      if (credentialFailureResult) return credentialFailureResult;

      return await this.finalizeChannexFullSyncProviderSteps({
        providerPlan,
        credentialContext,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        payloadSummaries,
        mappingSnapshot,
        baseNotes,
        stageLog,
        mark,
        finalize,
      });
    } catch (error) {
      const errorDetails = buildChannexFullSyncErrorDetails(stage, error);
      this.logChannexFullCertificationSync("service_catch", {
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom ?? rawDateFrom,
        dateTo: normalizedDateTo ?? rawDateTo,
        dryRun,
        providerMode,
        ...errorDetails,
      });
      return await finalize(
        bad(500, {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage,
          dryRun,
          providerMode,
          error: "Failed to run Channex certification full sync.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
          errorName: errorDetails.errorName,
          errorMessage: errorDetails.errorMessage,
          details: errorDetails.details,
          stackSummary: errorDetails.stackSummary,
          debug: {
            payloadsOmitted: true,
            stages: stageLog,
          },
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
              errorMessage: "Failed to run Channex certification full sync.",
              details: errorDetails.details,
              stage,
            },
          ],
          rawDetails: {
            caughtError: errorDetails,
            dryRun,
            providerMode,
            payloadsOmitted: true,
            stageLog,
          },
        }
      );
    }
  }
}
