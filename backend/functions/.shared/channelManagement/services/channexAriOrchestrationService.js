import { parseIsoDateParam } from "../utils/channexAriDateUtils.js";
import {
  buildSyncDateRangeValidationFailure,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  dedupeByJson,
  getCombinedSyncStatus,
  getInvalidRequestOrFailedStatus,
  resultListHasErrors,
  resultListHasWarnings,
} from "../utils/channexAriExecutionUtils.js";

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
const appendUniqueNotes = (baseNotes, extraNotes) => {
  for (const note of Array.isArray(extraNotes) ? extraNotes : []) {
    if (note && !baseNotes.includes(note)) baseNotes.push(note);
  }
};
const getRestrictionSkipNote = ({
  availabilityStep,
  availabilityCalledProvider,
  availabilityWarnings,
  availabilityErrors,
}) => {
  if (availabilityStep?.statusCode === 200 && !availabilityCalledProvider) {
    return "Restrictions sync was skipped because availability sync did not make a provider call.";
  }
  if (availabilityWarnings || availabilityErrors) {
    return "Restrictions sync was skipped because availability sync returned warnings or errors.";
  }
  if (availabilityStep?.statusCode === 200) return null;
  return "Restrictions sync was skipped because availability sync did not complete successfully.";
};
const buildFailedStepErrors = (
  step,
  response,
  fallbackCode,
  fallbackMessage,
  options = {}
) => {
  if (
    step?.statusCode === 200 ||
    (options.optional && (step === null || step === undefined))
  ) {
    return [];
  }
  return [
    {
      errorCode: response?.errorCode ?? fallbackCode,
      errorMessage: response?.error ?? fallbackMessage,
    },
  ];
};
const getStepResponse = (step, response) =>
  step?.statusCode === 200 ? response : step;
const getOptionalStepResponse = (step, response) =>
  step === null || step === undefined ? null : getStepResponse(step, response);
const getSuccessfulStepSummary = (response) => ({
  requestCount: response?.requestCount ?? 0,
  calledProvider: response?.calledProvider ?? false,
  results: response?.results ?? [],
});
const getStepRequestCount = (step, response) =>
  step && Number.isFinite(Number(response?.requestCount))
    ? Number(response.requestCount)
    : 0;
const getStepSummary = (step, response) =>
  step?.statusCode === 200 ? getSuccessfulStepSummary(response) : step;
const getOptionalStepSummary = (step, response) =>
  step === null || step === undefined ? null : getStepSummary(step, response);
const appendMissingMappingNotes = (notes, missingMappings) =>
  Array.isArray(missingMappings) && missingMappings.length
    ? [...notes, `Missing mappings: ${missingMappings.join(", ")}`]
    : notes;
const getCapturedGroupedOutboundPayloadSnapshot = (captureState) =>
  Array.isArray(captureState?.groupedOutboundPayloadSnapshot)
    ? captureState.groupedOutboundPayloadSnapshot
    : [];
const getAriSyncOverallSuccess = ({
  availabilityStep,
  availabilityCalledProvider,
  availabilityWarnings,
  availabilityErrors,
  restrictionsStep,
  restrictionsCalledProvider,
  restrictionsWarnings,
  restrictionsErrors,
}) =>
  [
    availabilityStep?.statusCode === 200,
    availabilityCalledProvider,
    !availabilityWarnings,
    !availabilityErrors,
    restrictionsStep?.statusCode === 200,
    restrictionsCalledProvider,
    !restrictionsWarnings,
    !restrictionsErrors,
  ].every(Boolean);

export default class ChannexAriOrchestrationService {
  constructor({
    createChannexSyncFinalizer,
    getChannexAriTargets,
    syncChannexAvailability,
    syncChannexRestrictions,
  }) {
    this.createChannexSyncFinalizer = createChannexSyncFinalizer;
    this.getChannexAriTargets = getChannexAriTargets;
    this.syncChannexAvailability = syncChannexAvailability;
    this.syncChannexRestrictions = syncChannexRestrictions;
  }

  async runGatedChannexAriSteps({
    userId,
    domitsPropertyId,
    dateFrom,
    dateTo,
    baseNotes,
  }) {
    const availabilityCaptureState = {};
    const availabilityStep = await this.syncChannexAvailability(
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      {
        skipEvidence: true,
        includeEvidenceMetadata: false,
        captureState: availabilityCaptureState,
      }
    );
    const availabilityResponse = availabilityStep?.response || {};
    const availabilityCalledProvider = !!availabilityResponse.calledProvider;
    const availabilityWarnings = resultListHasWarnings(
      availabilityResponse.results
    );
    const availabilityErrors = resultListHasErrors(availabilityResponse.results);

    let restrictionsStep = null;
    let restrictionsCaptureState = null;
    if (
      availabilityStep?.statusCode === 200 &&
      availabilityResponse.ready !== false &&
      availabilityCalledProvider &&
      !availabilityWarnings &&
      !availabilityErrors
    ) {
      restrictionsCaptureState = {};
      restrictionsStep = await this.syncChannexRestrictions(
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
        {
          skipEvidence: true,
          includeEvidenceMetadata: false,
          captureState: restrictionsCaptureState,
        }
      );
    } else {
      const skipNote = getRestrictionSkipNote({
        availabilityStep,
        availabilityCalledProvider,
        availabilityWarnings,
        availabilityErrors,
      });
      if (skipNote) baseNotes.push(skipNote);
    }

    const restrictionsResponse = restrictionsStep?.response || null;
    appendUniqueNotes(baseNotes, restrictionsResponse?.notes);
    return {
      availabilityCaptureState,
      restrictionsCaptureState,
      availabilityStep,
      restrictionsStep,
      availabilityResponse,
      restrictionsResponse,
      availabilityCalledProvider,
      restrictionsCalledProvider: !!restrictionsResponse?.calledProvider,
      availabilityWarnings,
      availabilityErrors,
      restrictionsWarnings: resultListHasWarnings(restrictionsResponse?.results),
      restrictionsErrors: resultListHasErrors(restrictionsResponse?.results),
    };
  }

  buildChannexMultiStepMappingSnapshot(readiness) {
    return {
      missingMappings: Array.isArray(readiness.missingMappings)
        ? readiness.missingMappings
        : [],
      propertyMapping: readiness.propertyMapping ?? null,
      roomTypeMappings: Array.isArray(readiness.roomTypeMappings)
        ? readiness.roomTypeMappings
        : [],
      ratePlanMappings: Array.isArray(readiness.ratePlanMappings)
        ? readiness.ratePlanMappings
        : [],
    };
  }

  buildChannexAriTargetsFailureEvidencePatch(readinessResult) {
    const readinessResponse = readinessResult?.response || {};
    return {
      integrationAccountId: readinessResponse.integrationAccountId ?? null,
      status: getInvalidRequestOrFailedStatus(readinessResult?.statusCode),
      overallSuccess: false,
      mappingSnapshot: {
        missingMappings: Array.isArray(readinessResponse.missingMappings)
          ? readinessResponse.missingMappings
          : [],
      },
      errors: [
        {
          errorCode:
            readinessResponse.errorCode ?? "CHANNEX_ARI_TARGETS_FAILED",
          errorMessage:
            readinessResponse.error ?? "Failed to get Channex ARI targets.",
          details: readinessResponse.details ?? null,
        },
      ],
      rawDetails: { readinessResult },
    };
  }

  buildBlockedChannexMultiStepSyncResult({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
    config,
    dateContext,
  }) {
    const responseBody = {
      channel: readiness.channel || "CHANNEX",
      integrationAccountId: readiness.integrationAccountId || null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
    };
    const blockedFieldsBeforeReady =
      config.getBlockedResponseFieldsBeforeReady?.(dateContext);
    if (blockedFieldsBeforeReady) {
      Object.assign(responseBody, blockedFieldsBeforeReady);
    }
    responseBody.ready = false;
    const blockedFieldsAfterReady =
      config.getBlockedResponseFieldsAfterReady?.(dateContext);
    if (blockedFieldsAfterReady) {
      Object.assign(responseBody, blockedFieldsAfterReady);
    }
    responseBody.calledProvider = false;
    responseBody.steps = { availability: null, restrictions: null };
    if (config.includeCombinedFieldsInBlockedResponse) {
      Object.assign(responseBody, {
        requestCount: 0,
        taskIds: [],
        warnings: [],
        errors: [],
      });
    }
    responseBody.overallSuccess = false;
    responseBody.notes = appendMissingMappingNotes(
      baseNotes,
      readiness.missingMappings
    );

    const response = ok(responseBody);
    return {
      response,
      evidencePatch: {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: [],
          restrictions: [],
        },
        providerResponseSummary: {
          calledProvider: false,
          requestCount: 0,
          steps: { availability: null, restrictions: null },
        },
        notes: response.response.notes,
        rawDetails: { readiness },
      },
    };
  }

  collectChannexMultiStepSyncResults({
    availabilityStep,
    restrictionsStep,
    availabilityResponse,
    restrictionsResponse,
    restrictionsOptional = false,
  }) {
    const restrictionsResults = restrictionsOptional
      ? restrictionsResponse?.results
      : restrictionsResponse.results;
    return {
      combinedTaskIds: dedupeByJson([
        ...collectTaskIdsFromResultList(availabilityResponse.results),
        ...collectTaskIdsFromResultList(restrictionsResults),
      ]),
      combinedWarnings: dedupeByJson([
        ...collectWarningsFromResultList(availabilityResponse.results),
        ...collectWarningsFromResultList(restrictionsResults),
      ]),
      combinedErrors: dedupeByJson([
        ...collectErrorsFromResultList(availabilityResponse.results),
        ...collectErrorsFromResultList(restrictionsResults),
        ...buildFailedStepErrors(
          availabilityStep,
          availabilityResponse,
          "CHANNEX_AVAILABILITY_STEP_FAILED",
          "Availability step failed."
        ),
        ...buildFailedStepErrors(
          restrictionsStep,
          restrictionsResponse,
          "CHANNEX_RESTRICTIONS_STEP_FAILED",
          "Restrictions step failed.",
          { optional: restrictionsOptional }
        ),
      ]),
    };
  }

  buildChannexMultiStepValidationInput({
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    dateContext,
    config,
  }) {
    const validationInput = {
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    };
    const validationFields = config.getValidationFields?.(dateContext);
    if (validationFields) Object.assign(validationInput, validationFields);
    return validationInput;
  }

  buildChannexMultiStepSuccessResponseBody({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    dateContext,
    config,
    availabilityStep,
    restrictionsStep,
    availabilityResponse,
    restrictionsResponse,
    restrictionsIntegrationAccountId,
    getRestrictionsResponse,
    calledProvider,
    combinedRequestCount,
    combinedTaskIds,
    combinedWarnings,
    combinedErrors,
    overallSuccess,
    baseNotes,
  }) {
    const responseBody = {
      channel: readiness.channel || "CHANNEX",
      integrationAccountId:
        availabilityResponse.integrationAccountId ??
        restrictionsIntegrationAccountId ??
        readiness.integrationAccountId ??
        null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
    };
    const beforeReady =
      config.getSuccessResponseFieldsBeforeReady?.(dateContext);
    if (beforeReady) Object.assign(responseBody, beforeReady);
    responseBody.ready = true;
    const afterReady = config.getSuccessResponseFieldsAfterReady?.(dateContext);
    if (afterReady) Object.assign(responseBody, afterReady);
    responseBody.calledProvider = calledProvider;
    responseBody.steps = {
      availability: getStepResponse(availabilityStep, availabilityResponse),
      restrictions: getRestrictionsResponse(
        restrictionsStep,
        restrictionsResponse
      ),
    };
    if (config.includeCombinedFieldsInSuccessResponse) {
      Object.assign(responseBody, {
        requestCount: combinedRequestCount,
        taskIds: combinedTaskIds,
        warnings: combinedWarnings,
        errors: combinedErrors,
      });
    }
    responseBody.overallSuccess = overallSuccess;
    responseBody.notes = baseNotes;
    return responseBody;
  }

  buildChannexMultiStepResponse({ responseBody, combinedErrors, config }) {
    if (!config.providerFailureStatusCode || !combinedErrors.length) {
      return ok(responseBody);
    }
    return bad(config.providerFailureStatusCode, {
      ...responseBody,
      error: config.providerFailureMessage ?? config.catchErrorMessage,
      errorCode: config.providerFailureCode ?? config.catchErrorCode,
    });
  }

  buildChannexMultiStepRestrictionsContext({ config, restrictionsResponse }) {
    return {
      getRestrictionsResponse: config.restrictionsOptional
        ? getOptionalStepResponse
        : getStepResponse,
      getRestrictionsSummary: config.restrictionsOptional
        ? getOptionalStepSummary
        : getStepSummary,
      restrictionsIntegrationAccountId: config.restrictionsOptional
        ? restrictionsResponse?.integrationAccountId
        : restrictionsResponse.integrationAccountId,
    };
  }

  buildChannexMultiStepRawDetails({
    readiness,
    config,
    preStepContext,
    dateContext,
    availabilityStep,
    restrictionsStep,
  }) {
    const rawDetails = { readiness };
    const beforeSteps = config.getRawDetailsBeforeSteps?.(
      preStepContext,
      dateContext
    );
    if (beforeSteps) Object.assign(rawDetails, beforeSteps);
    rawDetails.availabilityStep = availabilityStep;
    rawDetails.restrictionsStep = restrictionsStep;
    const afterSteps = config.getRawDetailsAfterSteps?.(dateContext);
    if (afterSteps) Object.assign(rawDetails, afterSteps);
    return rawDetails;
  }

  buildChannexMultiStepCaughtRawDetails({ config, dateContext, details }) {
    const rawDetails = { caughtError: details };
    const caughtDetails = config.getCaughtRawDetails?.(dateContext);
    if (caughtDetails) Object.assign(rawDetails, caughtDetails);
    return rawDetails;
  }

  async runChannexMultiStepSync({
    userId,
    domitsPropertyId,
    dateFrom,
    dateTo,
    options,
    config,
  }) {
    const startedAt = Date.now();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const dateContext = config.normalizeDateRange({ dateFrom, dateTo });
    const {
      normalizedDateFrom,
      normalizedDateTo,
      rawDateFrom,
      rawDateTo,
    } = dateContext;
    const finalize = this.createChannexSyncFinalizer({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      rawDateFrom,
      rawDateTo,
      startedAt,
      syncType: config.syncType,
      options,
    });

    const validationFailure = buildSyncDateRangeValidationFailure(
      this.buildChannexMultiStepValidationInput({
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        dateContext,
        config,
      })
    );
    if (validationFailure) {
      return await finalize(
        validationFailure.response,
        validationFailure.evidencePatch
      );
    }

    try {
      const readinessResult = await this.getChannexAriTargets(
        normalizedUserId,
        normalizedDomitsPropertyId
      );
      if (readinessResult?.statusCode !== 200) {
        return await finalize(
          readinessResult,
          this.buildChannexAriTargetsFailureEvidencePatch(readinessResult)
        );
      }

      const readiness = readinessResult.response || {};
      const baseNotes = config.createBaseNotes(dateContext);
      const mappingSnapshot =
        this.buildChannexMultiStepMappingSnapshot(readiness);
      if (!readiness.ready) {
        const blocked = this.buildBlockedChannexMultiStepSyncResult({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes,
          mappingSnapshot,
          config,
          dateContext,
        });
        return await finalize(blocked.response, blocked.evidencePatch);
      }

      const preStepContext =
        (await config.beforeRunSteps?.({
          normalizedUserId,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          dateContext,
        })) || {};
      const stepContext = await config.runSteps({
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        baseNotes,
      });
      const {
        availabilityCaptureState,
        restrictionsCaptureState,
        availabilityStep,
        restrictionsStep,
        availabilityResponse,
        restrictionsResponse,
        availabilityCalledProvider,
        restrictionsCalledProvider,
        availabilityWarnings,
        availabilityErrors,
        restrictionsWarnings,
        restrictionsErrors,
      } = stepContext;
      const { combinedTaskIds, combinedWarnings, combinedErrors } =
        this.collectChannexMultiStepSyncResults({
          availabilityStep,
          restrictionsStep,
          availabilityResponse,
          restrictionsResponse,
          restrictionsOptional: config.restrictionsOptional,
        });
      const overallSuccess = config.getOverallSuccess({
        availabilityStep,
        restrictionsStep,
        availabilityCalledProvider,
        restrictionsCalledProvider,
        availabilityWarnings,
        availabilityErrors,
        restrictionsWarnings,
        restrictionsErrors,
        combinedWarnings,
        combinedErrors,
      });
      const calledProvider =
        availabilityCalledProvider || restrictionsCalledProvider;
      const combinedRequestCount =
        getStepRequestCount(availabilityStep, availabilityResponse) +
        getStepRequestCount(restrictionsStep, restrictionsResponse);
      const restrictionsContext =
        this.buildChannexMultiStepRestrictionsContext({
          config,
          restrictionsResponse,
        });
      const responseBody = this.buildChannexMultiStepSuccessResponseBody({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        dateContext,
        config,
        availabilityStep,
        restrictionsStep,
        availabilityResponse,
        restrictionsResponse,
        restrictionsIntegrationAccountId:
          restrictionsContext.restrictionsIntegrationAccountId,
        getRestrictionsResponse: restrictionsContext.getRestrictionsResponse,
        calledProvider,
        combinedRequestCount,
        combinedTaskIds,
        combinedWarnings,
        combinedErrors,
        overallSuccess,
        baseNotes,
      });
      const response = this.buildChannexMultiStepResponse({
        responseBody,
        combinedErrors,
        config,
      });
      const rawDetails = this.buildChannexMultiStepRawDetails({
        readiness,
        config,
        preStepContext,
        dateContext,
        availabilityStep,
        restrictionsStep,
      });

      return await finalize(response, {
        integrationAccountId:
          response.response.integrationAccountId ??
          readiness.integrationAccountId ??
          null,
        status: getCombinedSyncStatus({
          overallSuccess,
          providerCalled: calledProvider,
          combinedErrors,
          combinedWarnings,
          blockNoProviderWithErrors: !!config.blockNoProviderWithErrors,
        }),
        overallSuccess,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: getCapturedGroupedOutboundPayloadSnapshot(
            availabilityCaptureState
          ),
          restrictions: getCapturedGroupedOutboundPayloadSnapshot(
            restrictionsCaptureState
          ),
        },
        providerResponseSummary: {
          calledProvider: response.response.calledProvider,
          requestCount: combinedRequestCount,
          steps: {
            availability: getStepSummary(
              availabilityStep,
              availabilityResponse
            ),
            restrictions: restrictionsContext.getRestrictionsSummary(
              restrictionsStep,
              restrictionsResponse
            ),
          },
        },
        taskIds: combinedTaskIds,
        warnings: combinedWarnings,
        errors: combinedErrors,
        notes: baseNotes,
        rawDetails,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          ...(config.getCaughtResponseFields?.(dateContext) ?? undefined),
          error: config.catchErrorMessage,
          errorCode: config.catchErrorCode,
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: config.catchErrorCode,
              errorMessage: config.catchErrorMessage,
              details,
            },
          ],
          rawDetails: this.buildChannexMultiStepCaughtRawDetails({
            config,
            dateContext,
            details,
          }),
        }
      );
    }
  }

  async syncChannexAri(
    userId,
    domitsPropertyId,
    dateFrom,
    dateTo,
    options = {}
  ) {
    return this.runChannexMultiStepSync({
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      options,
      config: {
        syncType: "ari",
        normalizeDateRange: ({
          dateFrom: rawDateFrom,
          dateTo: rawDateTo,
        }) => ({
          rawDateFrom,
          rawDateTo,
          normalizedDateFrom: parseIsoDateParam(rawDateFrom),
          normalizedDateTo: parseIsoDateParam(rawDateTo),
        }),
        createBaseNotes: () => [
          "Manual staging orchestration only. This endpoint runs the existing availability sync first and the Channex restrictions sync second.",
          "Restrictions sync sends rate values and can include mapped stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay fields when supported Domits calendar/global restrictions are present.",
        ],
        runSteps: (stepContext) =>
          this.runGatedChannexAriSteps(stepContext),
        getOverallSuccess: getAriSyncOverallSuccess,
        restrictionsOptional: true,
        catchErrorCode: "CHANNEX_ARI_SYNC_FAILED",
        catchErrorMessage: "Failed to run combined Channex ARI sync.",
      },
    });
  }
}
