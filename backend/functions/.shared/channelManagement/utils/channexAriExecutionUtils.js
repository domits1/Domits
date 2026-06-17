import {
  CHANNEX_RESTRICTIONS_SYNC_MODE,
  CHANNEX_RESTRICTIONS_SYNC_VERSION,
} from "./channexRestrictionsSyncVersion.js";
import {
  CHANNEX_CERTIFICATION_FULL_SYNC_DAYS,
  collectChannexRestrictionFieldsFromGroups,
  countInclusiveIsoDateRangeDays,
  summarizeChannexGroupedPayloads,
  summarizeChannexRequestBody,
} from "./channexAriPayloadUtils.js";

const nowMs = () => Date.now();
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const getInvalidRequestOrFailedStatus = (statusCode) => {
  if (statusCode === 400) {
    return "INVALID_REQUEST";
  }
  return "FAILED";
};
const getCaptureState = (options) => {
  const captureState = options?.captureState;
  if (captureState && typeof captureState === "object") {
    return captureState;
  }
  return null;
};
const logChannexRestrictionsSync = (stage, fields = {}) => {
  try {
    console.info(
      JSON.stringify({
        event: "CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC",
        restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
        restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
        stage,
        ...fields,
      })
    );
  } catch {
    console.info("CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC", stage);
  }
};
const buildChannexRestrictionsSyncResponseMetadata = () => ({
  restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
  restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
});
const addChannexRestrictionsSyncVersion = (result) => {
  if (!result || typeof result !== "object") return result;
  const metadata = buildChannexRestrictionsSyncResponseMetadata();
  const response =
    result.response && typeof result.response === "object" && !Array.isArray(result.response)
      ? { ...metadata, ...result.response }
      : {
          ...metadata,
          value: result.response ?? null,
        };

  return {
    ...result,
    response,
  };
};
const buildInvalidRequestEvidencePatch = (errorCode, errorMessage) => ({
  status: "INVALID_REQUEST",
  errors: [{ errorCode, errorMessage }],
});
const buildChannexSyncEvidencePatch = ({
  normalizedUserId,
  normalizedDomitsPropertyId,
  syncType,
  dateFrom,
  dateTo,
  startedAt,
  evidencePatch,
  taskIdsDefault = [],
}) => ({
  userId: normalizedUserId,
  integrationAccountId: evidencePatch.integrationAccountId ?? null,
  domitsPropertyId: normalizedDomitsPropertyId,
  syncType,
  dateFrom,
  dateTo,
  startedAt,
  finishedAt: nowMs(),
  status: evidencePatch.status ?? "FAILED",
  overallSuccess: evidencePatch.overallSuccess ?? false,
  mappingSnapshot: evidencePatch.mappingSnapshot ?? null,
  groupedOutboundPayloadSnapshot: evidencePatch.groupedOutboundPayloadSnapshot ?? null,
  providerResponseSummary: evidencePatch.providerResponseSummary ?? null,
  taskIds: evidencePatch.taskIds ?? taskIdsDefault,
  warnings: evidencePatch.warnings ?? [],
  errors: evidencePatch.errors ?? [],
  notes: evidencePatch.notes ?? [],
  rawDetails: evidencePatch.rawDetails ?? null,
});
const buildSyncDateRangeValidationFailure = ({
  normalizedUserId,
  normalizedDomitsPropertyId,
  normalizedDateFrom,
  normalizedDateTo,
  rawDateFrom = null,
  rawDateTo = null,
  requireCompleteDatePair = false,
  usingDefaultDateRange = false,
}) => {
  if (!normalizedUserId) {
    return {
      response: bad(400, { error: "Missing required query param: userId" }),
      evidencePatch: buildInvalidRequestEvidencePatch("MISSING_USER_ID", "Missing required query param: userId"),
    };
  }
  if (!normalizedDomitsPropertyId) {
    return {
      response: bad(400, { error: "Missing required query param: domitsPropertyId" }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "MISSING_DOMITS_PROPERTY_ID",
        "Missing required query param: domitsPropertyId"
      ),
    };
  }
  if (requireCompleteDatePair && !usingDefaultDateRange && (!rawDateFrom || !rawDateTo)) {
    const message = "Provide both dateFrom and dateTo, or omit both to use the default certification full-sync range.";
    return {
      response: bad(400, { error: message }),
      evidencePatch: buildInvalidRequestEvidencePatch("CHANNEX_FULL_SYNC_PARTIAL_DATE_RANGE", message),
    };
  }
  if (!normalizedDateFrom) {
    return {
      response: bad(400, { error: "Invalid or missing required query param: dateFrom" }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "INVALID_DATE_FROM",
        "Invalid or missing required query param: dateFrom"
      ),
    };
  }
  if (!normalizedDateTo) {
    return {
      response: bad(400, { error: "Invalid or missing required query param: dateTo" }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "INVALID_DATE_TO",
        "Invalid or missing required query param: dateTo"
      ),
    };
  }
  if (normalizedDateFrom > normalizedDateTo) {
    return {
      response: bad(400, {
        error: "dateFrom must be less than or equal to dateTo.",
      }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "INVALID_DATE_RANGE",
        "dateFrom must be less than or equal to dateTo."
      ),
    };
  }
  const totalDays = countInclusiveIsoDateRangeDays(normalizedDateFrom, normalizedDateTo);
  if (!totalDays || totalDays > CHANNEX_CERTIFICATION_FULL_SYNC_DAYS) {
    const message = `Channex sync date range must be ${CHANNEX_CERTIFICATION_FULL_SYNC_DAYS} days or fewer.`;
    return {
      response: bad(400, {
        error: message,
        errorCode: "CHANNEX_SYNC_RANGE_TOO_LARGE",
        maxDays: CHANNEX_CERTIFICATION_FULL_SYNC_DAYS,
        totalDays,
      }),
      evidencePatch: buildInvalidRequestEvidencePatch("CHANNEX_SYNC_RANGE_TOO_LARGE", message),
    };
  }
  return null;
};
const withOptionalDetails = (target, details) => {
  if (details) {
    target.details = details;
  }
  return target;
};
const dedupeByJson = (items) =>
  Array.from(
    new Map(
      (Array.isArray(items) ? items : [])
        .filter((item) => item !== undefined && item !== null)
        .map((item) => [JSON.stringify(item), item])
    ).values()
  );
const collectTaskIdsFromResultList = (results) =>
  dedupeByJson(
    (Array.isArray(results) ? results : [])
      .map((result) => requireStr(result?.taskId))
      .filter(Boolean)
  );
const collectWarningsFromResultList = (results) =>
  dedupeByJson(
    (Array.isArray(results) ? results : []).flatMap((result) =>
      Array.isArray(result?.warnings) ? result.warnings.filter((warning) => warning !== undefined && warning !== null) : []
    )
  );
const collectErrorsFromResultList = (results) =>
  dedupeByJson(
    (Array.isArray(results) ? results : [])
      .filter((result) => result?.success === false || result?.errorCode || result?.errorMessage)
      .map((result) => ({
        externalPropertyId: result?.externalPropertyId ?? null,
        externalRoomTypeId: result?.externalRoomTypeId ?? null,
        externalRatePlanId: result?.externalRatePlanId ?? null,
        errorCode: result?.errorCode ?? null,
        errorMessage: result?.errorMessage ?? null,
        httpStatus: result?.httpStatus ?? null,
      }))
  );
const resultListHasWarnings = (results) =>
  Array.isArray(results) && results.some((result) => Array.isArray(result?.warnings) && result.warnings.length > 0);
const resultListHasErrors = (results) =>
  Array.isArray(results) && results.some((result) => result?.success === false);
const getCombinedSyncStatus = ({
  overallSuccess,
  providerCalled,
  combinedErrors,
  combinedWarnings,
  blockNoProviderWithErrors = false,
}) => {
  if (overallSuccess) {
    return "SUCCESS";
  }
  if (providerCalled) {
    if (combinedErrors.length === 0 && combinedWarnings.length) {
      return "COMPLETED_WITH_WARNINGS";
    }
    return "PARTIAL";
  }
  if (blockNoProviderWithErrors && combinedErrors.length) {
    return "BLOCKED";
  }
  return "NOOP";
};
const deriveEvidenceOutcome = ({ statusCode, ready, calledProvider, results, overallSuccess }) => {
  const normalizedResults = Array.isArray(results) ? results : [];
  const warningCount = collectWarningsFromResultList(normalizedResults).length;
  const failedCount = normalizedResults.filter((result) => result?.success === false).length;
  const successfulCount = normalizedResults.filter((result) => result?.success === true).length;

  if (statusCode === 400) return { status: "INVALID_REQUEST", overallSuccess: false };
  if (statusCode >= 500) return { status: "FAILED", overallSuccess: false };
  if (statusCode >= 401) return { status: "BLOCKED", overallSuccess: false };
  if (ready === false) return { status: "BLOCKED", overallSuccess: false };
  if (!calledProvider) return { status: "NOOP", overallSuccess: false };
  if (overallSuccess === true && warningCount === 0 && failedCount === 0) {
    return { status: "SUCCESS", overallSuccess: true };
  }
  if (overallSuccess === true && warningCount > 0 && failedCount === 0) {
    return { status: "COMPLETED_WITH_WARNINGS", overallSuccess: true };
  }
  if (failedCount > 0 && successfulCount > 0) return { status: "PARTIAL", overallSuccess: false };
  if (failedCount > 0) return { status: "FAILED", overallSuccess: false };
  if (warningCount > 0) return { status: "COMPLETED_WITH_WARNINGS", overallSuccess: true };

  return { status: "SUCCESS", overallSuccess: true };
};
const summarizePayloadPreviewForEvidence = (payloadPreview) => {
  if (!payloadPreview || typeof payloadPreview !== "object" || Array.isArray(payloadPreview)) return payloadPreview ?? null;
  const availability = payloadPreview.availabilityPayloadPreview || {};
  const restrictions = payloadPreview.restrictionRatePayloadPreview || {};

  return {
    channel: payloadPreview.channel ?? null,
    integrationAccountId: payloadPreview.integrationAccountId ?? null,
    domitsPropertyId: payloadPreview.domitsPropertyId ?? null,
    dateFrom: payloadPreview.dateFrom ?? null,
    dateTo: payloadPreview.dateTo ?? null,
    ready: payloadPreview.ready ?? null,
    missingMappings: Array.isArray(payloadPreview.missingMappings) ? payloadPreview.missingMappings : [],
    sourceSummary: payloadPreview.sourceSummary ?? null,
    availabilityPayloadPreview: {
      itemCount: Array.isArray(availability.items) ? availability.items.length : 0,
      groupCount: Array.isArray(availability.groupedPayloads) ? availability.groupedPayloads.length : 0,
      groupedPayloads: summarizeChannexGroupedPayloads(availability.groupedPayloads),
    },
    restrictionRatePayloadPreview: {
      itemCount: Array.isArray(restrictions.items) ? restrictions.items.length : 0,
      groupCount: Array.isArray(restrictions.groupedPayloads) ? restrictions.groupedPayloads.length : 0,
      groupedPayloads: summarizeChannexGroupedPayloads(restrictions.groupedPayloads),
    },
    notes: Array.isArray(payloadPreview.notes) ? payloadPreview.notes : [],
  };
};
const appendRestrictionSyncOutboundNotes = (notes, transformedPayloads) => {
  const sentChannexRestrictionFields = collectChannexRestrictionFieldsFromGroups(transformedPayloads);
  if (sentChannexRestrictionFields.length) {
    notes.push(
      `Restrictions sync included Channex restriction fields in outbound payloads: ${sentChannexRestrictionFields.join(", ")}.`
    );
  } else {
    notes.push("Restrictions sync outbound payloads are rate-only because no supported global stay restrictions or date-level calendar restriction overrides were available to send.");
  }
};
const formatChannexAvailabilityProviderResult = (result) => ({
  endpoint: result.endpoint ?? null,
  method: result.method ?? null,
  externalPropertyId: result.externalPropertyId ?? null,
  externalRoomTypeId: result.externalRoomTypeId ?? null,
  requestBody: summarizeChannexRequestBody(result.requestBody, result),
  providerStatus: result.providerStatus ?? null,
  httpStatus: result.httpStatus ?? null,
  success: !!result.success,
  taskId: result.taskId ?? null,
  warnings: Array.isArray(result.warnings) ? result.warnings : [],
  errorCode: result.errorCode ?? null,
  errorMessage: result.errorMessage ?? null,
});
const formatChannexRestrictionProviderResult = (result) => ({
  endpoint: result.endpoint ?? null,
  method: result.method ?? null,
  externalPropertyId: result.externalPropertyId ?? null,
  externalRoomTypeId: result.externalRoomTypeId ?? null,
  externalRatePlanId: result.externalRatePlanId ?? null,
  requestBody: summarizeChannexRequestBody(result.requestBody, result),
  providerStatus: result.providerStatus ?? null,
  httpStatus: result.httpStatus ?? null,
  success: !!result.success,
  taskId: result.taskId ?? null,
  warnings: Array.isArray(result.warnings) ? result.warnings : [],
  errorCode: result.errorCode ?? null,
  errorMessage: result.errorMessage ?? null,
});

export {
  addChannexRestrictionsSyncVersion,
  appendRestrictionSyncOutboundNotes,
  buildChannexSyncEvidencePatch,
  buildSyncDateRangeValidationFailure,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  dedupeByJson,
  deriveEvidenceOutcome,
  formatChannexAvailabilityProviderResult,
  formatChannexRestrictionProviderResult,
  getCaptureState,
  getCombinedSyncStatus,
  getInvalidRequestOrFailedStatus,
  logChannexRestrictionsSync,
  resultListHasErrors,
  resultListHasWarnings,
  summarizePayloadPreviewForEvidence,
  withOptionalDetails,
};
