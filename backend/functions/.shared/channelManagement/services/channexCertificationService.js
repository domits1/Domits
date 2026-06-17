import { buildCalendarDateRange } from "../utils/channexAriDateUtils.js";
import { CHANNEL_CHANNEX } from "../utils/channexBookingPollUtils.js";
import {
  CHANNEX_BOOKING_CANCELLED_TRIGGER,
  toBookingAvailabilityBridgeBooking,
} from "../utils/channexBookingRevisionUtils.js";
import { summarizeChannexGroupedPayloads } from "../utils/channexAriPayloadUtils.js";
import {
  buildChannexSyncEvidencePatch,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  formatChannexAvailabilityProviderResult,
  formatChannexRestrictionProviderResult,
  resultListHasErrors,
  resultListHasWarnings,
} from "../utils/channexAriExecutionUtils.js";

const nowMs = () => Date.now();
const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const compareAlphabetically = (left, right) => String(left).localeCompare(String(right));
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});

const CHANNEX_CERTIFICATION_CANCEL_ACTION = "certification-cancel-booking";
const CHANNEX_CERTIFICATION_CANCEL_MODE = "admin-certification-no-refund";
const CHANNEX_CERTIFICATION_CANCEL_REFUND_SKIPPED_REASON =
  "Channex certification/admin cancellation does not process guest refunds.";
const CHANNEX_CANCELLED_BOOKING_STATUS = "Cancelled";
const CHANNEX_ADMIN_CANCEL_ACTIVE_STATUSES = new Set(["awaiting payment", "paid"]);
const getDomitsBookingStatus = (booking) => String(booking?.status || "").trim().toLowerCase();
const isActiveDomitsBookingForChannexCancel = (booking) =>
  CHANNEX_ADMIN_CANCEL_ACTIVE_STATUSES.has(getDomitsBookingStatus(booking));
const isCancelledDomitsBooking = (booking) => ["cancelled", "canceled"].includes(getDomitsBookingStatus(booking));
const CHANNEX_CERTIFICATION_RATE_TARGETS = {
  bestAvailable: {
    label: "Best Available Rate",
    matches: (normalizedName) => normalizedName.includes("best") && normalizedName.includes("available"),
  },
  bedBreakfast: {
    label: "Bed & Breakfast",
    matches: (normalizedName) =>
      normalizedName.includes("bed") && normalizedName.includes("breakfast"),
  },
};
const CHANNEX_CERTIFICATION_MAX_AVAILABILITY = 1;
const CHANNEX_CERTIFICATION_ROOM_TARGETS = {
  twin: {
    label: "Twin Room",
    matches: (normalizedName) => normalizedName.includes("twin"),
  },
  double: {
    label: "Double Room",
    matches: (normalizedName) => normalizedName.includes("double"),
  },
};
const CHANNEX_CERTIFICATION_TEST_CASES = {
  "2": {
    title: "Single Date Update for Single Rate",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-22", fields: { rate: "333.00" } },
    ],
  },
  "3": {
    title: "Single Date Update for Multiple Rates",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-21", fields: { rate: "333.00" } },
      { room: "double", ratePlan: "bestAvailable", date: "2026-11-25", fields: { rate: "444.00" } },
      { room: "double", ratePlan: "bedBreakfast", date: "2026-11-29", fields: { rate: "456.23" } },
    ],
  },
  "4": {
    title: "Multiple Date Update for Multiple Rates",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", dateFrom: "2026-11-01", dateTo: "2026-11-10", fields: { rate: "241.00" } },
      { room: "double", ratePlan: "bestAvailable", dateFrom: "2026-11-10", dateTo: "2026-11-16", fields: { rate: "312.66" } },
      { room: "double", ratePlan: "bedBreakfast", dateFrom: "2026-11-01", dateTo: "2026-11-20", fields: { rate: "111.00" } },
    ],
  },
  "5": {
    title: "Min Stay Update",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-23", fields: { min_stay_through: 3 } },
      { room: "double", ratePlan: "bestAvailable", date: "2026-11-25", fields: { min_stay_through: 2 } },
      { room: "double", ratePlan: "bedBreakfast", date: "2026-11-15", fields: { min_stay_through: 5 } },
    ],
  },
  "6": {
    title: "Stop Sell Update",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-14", fields: { stop_sell: true } },
      { room: "double", ratePlan: "bestAvailable", date: "2026-11-16", fields: { stop_sell: true } },
      { room: "double", ratePlan: "bedBreakfast", date: "2026-11-20", fields: { stop_sell: true } },
    ],
  },
  "7": {
    title: "Multiple Restrictions Update",
    payloadType: "restrictions",
    updates: [
      {
        room: "twin",
        ratePlan: "bestAvailable",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-10",
        fields: { closed_to_arrival: true, closed_to_departure: false, max_stay: 4, min_stay_through: 1 },
      },
      {
        room: "twin",
        ratePlan: "bedBreakfast",
        dateFrom: "2026-11-12",
        dateTo: "2026-11-16",
        fields: { closed_to_arrival: false, closed_to_departure: true, min_stay_through: 6 },
      },
      {
        room: "double",
        ratePlan: "bestAvailable",
        dateFrom: "2026-11-10",
        dateTo: "2026-11-16",
        fields: { closed_to_arrival: true, min_stay_through: 2 },
      },
      {
        room: "double",
        ratePlan: "bedBreakfast",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-20",
        fields: { min_stay_through: 10 },
      },
    ],
  },
  "8": {
    title: "Half-year Update",
    payloadType: "restrictions",
    updates: [
      {
        room: "twin",
        ratePlan: "bestAvailable",
        dateFrom: "2026-12-01",
        dateTo: "2027-05-01",
        fields: { rate: "432.00", closed_to_arrival: false, closed_to_departure: false, min_stay_through: 2 },
      },
      {
        room: "double",
        ratePlan: "bestAvailable",
        dateFrom: "2026-12-01",
        dateTo: "2027-05-01",
        fields: { rate: "342.00", min_stay_through: 3 },
      },
    ],
  },
  "9": {
    title: "Single Date Availability Update",
    payloadType: "availability",
    updates: [
      { room: "twin", date: "2026-11-21", availability: 1 },
      { room: "double", date: "2026-11-25", availability: 0 },
    ],
  },
  "10": {
    title: "Multiple Date Availability Update",
    payloadType: "availability",
    updates: [
      { room: "twin", dateFrom: "2026-11-10", dateTo: "2026-11-16", availability: 1 },
      { room: "double", dateFrom: "2026-11-17", dateTo: "2026-11-24", availability: 1 },
    ],
  },
};
const normalizeCertificationName = (value) =>
  String(value || "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const findCertificationRoomMapping = (readiness, roomKey) => {
  const target = CHANNEX_CERTIFICATION_ROOM_TARGETS[roomKey];
  if (!target) return null;
  return (
    (Array.isArray(readiness?.roomTypeMappings) ? readiness.roomTypeMappings : []).find((mapping) =>
      target.matches(normalizeCertificationName(mapping?.externalRoomTypeName))
    ) || null
  );
};
const findCertificationRatePlanMapping = (readiness, roomMapping, ratePlanKey) => {
  const target = CHANNEX_CERTIFICATION_RATE_TARGETS[ratePlanKey];
  if (!target || !roomMapping) return null;
  const roomTypeId = requireStr(roomMapping.externalRoomTypeId);
  return (
    (Array.isArray(readiness?.ratePlanMappings) ? readiness.ratePlanMappings : []).find(
      (mapping) =>
        requireStr(mapping?.externalRoomTypeId) === roomTypeId &&
        target.matches(normalizeCertificationName(mapping?.externalRatePlanName))
    ) || null
  );
};
const getCertificationUpdateDates = (update) =>
  update?.date ? [update.date] : buildCalendarDateRange(update?.dateFrom, update?.dateTo);
const normalizeCertificationAvailabilityValue = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  return Math.max(0, Math.min(CHANNEX_CERTIFICATION_MAX_AVAILABILITY, Math.trunc(numericValue)));
};
const getCertificationRoomLabel = (roomKey) => CHANNEX_CERTIFICATION_ROOM_TARGETS[roomKey]?.label ?? roomKey;
const getCertificationRatePlanLabel = (ratePlanKey) =>
  CHANNEX_CERTIFICATION_RATE_TARGETS[ratePlanKey]?.label ?? ratePlanKey;
const getCertificationUpdateDateTarget = (update) => update.date || `${update.dateFrom || "?"} to ${update.dateTo || "?"}`;
const buildCertificationPayloadUpdate = ({ readiness, testCase, update }) => {
  const roomLabel = getCertificationRoomLabel(update.room);
  const roomMapping = findCertificationRoomMapping(readiness, update.room);
  if (!roomMapping) {
    return {
      failure: {
        target: roomLabel,
        errorCode: "CHANNEX_CERTIFICATION_ROOM_MAPPING_MISSING",
        errorMessage: `Missing Channex room type mapping for ${roomLabel}.`,
      },
    };
  }

  const dates = getCertificationUpdateDates(update);
  const dateTarget = getCertificationUpdateDateTarget(update);
  if (!dates.length) {
    return {
      failure: {
        target: dateTarget,
        errorCode: "CHANNEX_CERTIFICATION_TEST_INVALID_DATE_RANGE",
        errorMessage: "Certification test case update has an invalid date range.",
      },
    };
  }

  if (testCase.payloadType === "availability") {
    const availability = normalizeCertificationAvailabilityValue(update.availability);
    if (availability === null) {
      return {
        failure: {
          target: `${roomLabel} / ${dateTarget}`,
          errorCode: "CHANNEX_CERTIFICATION_TEST_INVALID_AVAILABILITY",
          errorMessage: "Certification availability update has an invalid availability value.",
        },
      };
    }
    return {
      values: dates.map((date) => ({
        property_id: roomMapping.externalPropertyId,
        room_type_id: roomMapping.externalRoomTypeId,
        date,
        availability,
      })),
    };
  }

  const ratePlanLabel = getCertificationRatePlanLabel(update.ratePlan);
  const ratePlanMapping = findCertificationRatePlanMapping(readiness, roomMapping, update.ratePlan);
  if (!ratePlanMapping) {
    return {
      failure: {
        target: `${roomLabel} / ${ratePlanLabel}`,
        errorCode: "CHANNEX_CERTIFICATION_RATE_PLAN_MAPPING_MISSING",
        errorMessage: `Missing Channex rate plan mapping for ${roomLabel} / ${ratePlanLabel}.`,
      },
    };
  }

  return {
    values: dates.map((date) => ({
      property_id: ratePlanMapping.externalPropertyId,
      rate_plan_id: ratePlanMapping.externalRatePlanId,
      date,
      ...update.fields,
    })),
  };
};
const collectChannexValueDateRange = (values) => {
  const dates = (Array.isArray(values) ? values : []).map((value) => requireStr(value?.date)).filter(Boolean).sort(compareAlphabetically);
  return {
    dateFrom: dates[0] ?? null,
    dateTo: dates.at(-1) ?? null,
  };
};
const formatCertificationTestCaseId = (value) => {
  const normalized = requireStr(value);
  return normalized ? normalized.replace(/^#/, "") : null;
};

export default class ChannexCertificationService {
  constructor({
    externalBookingImportRepository,
    channexBookingAvailabilityBridge,
    channexProviderClient,
    finalizeChannexSyncResult,
    getChannexAriTargets,
    buildChannexAriTargetsFailureEvidencePatch,
    buildChannexMultiStepMappingSnapshot,
    buildBlockedChannexMultiStepSyncResult,
    resolveChannexSyncCredentialContext,
  }) {
    this.externalBookingImportRepository = externalBookingImportRepository;
    this.channexBookingAvailabilityBridge = channexBookingAvailabilityBridge;
    this.channexProviderClient = channexProviderClient;
    this.finalizeChannexSyncResult = finalizeChannexSyncResult;
    this.getChannexAriTargets = getChannexAriTargets;
    this.buildChannexAriTargetsFailureEvidencePatch = buildChannexAriTargetsFailureEvidencePatch;
    this.buildChannexMultiStepMappingSnapshot = buildChannexMultiStepMappingSnapshot;
    this.buildBlockedChannexMultiStepSyncResult = buildBlockedChannexMultiStepSyncResult;
    this.resolveChannexSyncCredentialContext = resolveChannexSyncCredentialContext;
  }

  buildChannexCertificationCancelSkippedEvidence({ booking, reason }) {
    const bridgeBooking = toBookingAvailabilityBridgeBooking(booking);
    return {
      bookingId: bridgeBooking?.id ?? null,
      trigger: CHANNEX_BOOKING_CANCELLED_TRIGGER,
      syncType: "booking-availability",
      domitsPropertyId: bridgeBooking?.property_id ?? null,
      channexPropertyId: null,
      externalRoomTypeId: null,
      countOfRooms: null,
      countOfRoomsSource: null,
      affectedDateRange: { dateFrom: null, dateTo: null },
      affectedDates: [],
      availabilityValuesSent: [],
      requestCount: 0,
      taskIds: [],
      warnings: [],
      errors: [],
      overallSuccess: false,
      skipped: true,
      reason,
    };
  }

  async cancelChannexCertificationBooking(userId, domitsPropertyId, body = {}) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const bookingId = requireStr(body?.bookingId);

    if (!normalizedUserId) {
      return bad(400, { error: "Missing required query param: userId" });
    }

    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }

    if (!bookingId) {
      return bad(400, { error: "Missing bookingId." });
    }

    const bookingBefore = await this.externalBookingImportRepository.getBookingById(bookingId);
    if (!bookingBefore) {
      return bad(404, { error: "Booking not found." });
    }

    if (requireStr(bookingBefore.propertyId) !== normalizedDomitsPropertyId) {
      return bad(403, {
        error: "BOOKING_PROPERTY_MISMATCH",
        message: "Booking does not belong to the requested Domits property.",
      });
    }

    const alreadyCancelled = isCancelledDomitsBooking(bookingBefore);
    const bookingAfter = alreadyCancelled
      ? bookingBefore
      : await this.externalBookingImportRepository.cancelImportedBooking(bookingId);

    if (!bookingAfter) {
      return bad(500, {
        error: "DOMITS_BOOKING_CANCEL_FAILED",
        message: "Domits booking could not be cancelled for the Channex certification admin action.",
      });
    }

    let channexAvailabilitySync = null;
    if (alreadyCancelled) {
      channexAvailabilitySync = this.buildChannexCertificationCancelSkippedEvidence({
        booking: bookingAfter,
        reason: "BOOKING_ALREADY_CANCELLED",
      });
    } else if (isActiveDomitsBookingForChannexCancel(bookingBefore)) {
      channexAvailabilitySync = await this.channexBookingAvailabilityBridge.syncAvailabilityForBookingChange({
        userId: bookingBefore.hostId,
        bookingBefore: toBookingAvailabilityBridgeBooking(bookingBefore),
        bookingAfter: toBookingAvailabilityBridgeBooking(bookingAfter),
        trigger: CHANNEX_BOOKING_CANCELLED_TRIGGER,
      });
    } else {
      channexAvailabilitySync = this.buildChannexCertificationCancelSkippedEvidence({
        booking: bookingAfter,
        reason: "BOOKING_STATUS_NOT_ACTIVE_FOR_CHANNEX_CANCEL",
      });
    }

    return ok({
      channel: CHANNEL_CHANNEX,
      action: CHANNEX_CERTIFICATION_CANCEL_ACTION,
      mode: CHANNEX_CERTIFICATION_CANCEL_MODE,
      bookingId,
      domitsPropertyId: normalizedDomitsPropertyId,
      requestedByUserId: normalizedUserId,
      previousStatus: bookingBefore.status ?? null,
      status: bookingAfter.status ?? CHANNEX_CANCELLED_BOOKING_STATUS,
      alreadyCancelled,
      refundProcessed: false,
      refundSkippedReason: CHANNEX_CERTIFICATION_CANCEL_REFUND_SKIPPED_REASON,
      reason: requireStr(body?.reason),
      booking: bookingAfter,
      channexAvailabilitySync,
    });
  }

  buildChannexCertificationTestCasePayload({ readiness, testCase }) {
    const failures = [];
    const values = [];

    for (const update of Array.isArray(testCase?.updates) ? testCase.updates : []) {
      const updateResult = buildCertificationPayloadUpdate({ readiness, testCase, update });
      if (updateResult.failure) failures.push(updateResult.failure);
      if (Array.isArray(updateResult.values)) values.push(...updateResult.values);
    }

    if (failures.length) {
      return {
        ok: false,
        result: bad(409, {
          error: "Required Channex certification test mapping is missing.",
          errorCode: "CHANNEX_CERTIFICATION_TEST_MAPPING_MISSING",
          failures,
        }),
      };
    }

    if (!values.length) {
      return {
        ok: false,
        result: bad(400, {
          error: "Certification test case generated no values.",
          errorCode: "CHANNEX_CERTIFICATION_TEST_EMPTY_PAYLOAD",
        }),
      };
    }

    const externalPropertyIds = Array.from(
      new Set(values.map((value) => requireStr(value.property_id)).filter(Boolean))
    ).sort(compareAlphabetically);
    const externalRoomTypeIds = Array.from(
      new Set(values.map((value) => requireStr(value.room_type_id)).filter(Boolean))
    ).sort(compareAlphabetically);
    const externalRatePlanIds = Array.from(
      new Set(values.map((value) => requireStr(value.rate_plan_id)).filter(Boolean))
    ).sort(compareAlphabetically);
    const payload = {
      externalPropertyId: externalPropertyIds.length === 1 ? externalPropertyIds[0] : null,
      externalPropertyIds,
      externalRoomTypeId: externalRoomTypeIds.length === 1 ? externalRoomTypeIds[0] : null,
      externalRoomTypeIds,
      externalRatePlanId: externalRatePlanIds.length === 1 ? externalRatePlanIds[0] : null,
      externalRatePlanIds,
      values,
    };

    return {
      ok: true,
      payloads: [payload],
      dateRange: collectChannexValueDateRange(values),
    };
  }

  async syncChannexCertificationTestCase(userId, domitsPropertyId, body = {}, options = {}) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const testCaseId = formatCertificationTestCaseId(body?.testCaseId ?? body?.caseId ?? body?.id);
    const testCase = testCaseId ? CHANNEX_CERTIFICATION_TEST_CASES[testCaseId] : null;

    const finalize = async (result, evidencePatch = {}, dateRange = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: testCaseId ? `certification_case_${testCaseId}` : "certification_case",
          dateFrom: dateRange.dateFrom ?? null,
          dateTo: dateRange.dateTo ?? null,
          startedAt,
          evidencePatch,
        }),
        options
      );

    if (!normalizedUserId) {
      return await finalize(bad(400, { error: "Missing required query param: userId" }), {
        status: "INVALID_REQUEST",
        errors: [{ errorCode: "MISSING_USER_ID", errorMessage: "Missing required query param: userId" }],
      });
    }
    if (!normalizedDomitsPropertyId) {
      return await finalize(bad(400, { error: "Missing required query param: domitsPropertyId" }), {
        status: "INVALID_REQUEST",
        errors: [{ errorCode: "MISSING_DOMITS_PROPERTY_ID", errorMessage: "Missing required query param: domitsPropertyId" }],
      });
    }
    if (!testCase) {
      return await finalize(bad(400, {
        error: "Invalid or missing certification test case ID.",
        errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_INVALID",
        supportedTestCaseIds: Object.keys(CHANNEX_CERTIFICATION_TEST_CASES),
      }), {
        status: "INVALID_REQUEST",
        errors: [
          {
            errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_INVALID",
            errorMessage: "Invalid or missing certification test case ID.",
          },
        ],
      });
    }

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        return await finalize(readinessResult, this.buildChannexAriTargetsFailureEvidencePatch(readinessResult));
      }

      const readiness = readinessResult.response || {};
      const mappingSnapshot = this.buildChannexMultiStepMappingSnapshot(readiness);
      const baseNotes = [
        `Channex certification test #${testCaseId}: ${testCase.title}.`,
        "Change-only update mode: only the fields required by this certification test case are included with the required identifiers and dates.",
      ];

      if (!readiness.ready) {
        const blocked = this.buildBlockedChannexMultiStepSyncResult({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom: null,
          normalizedDateTo: null,
          baseNotes,
          mappingSnapshot,
          config: {
            includeCombinedFieldsInBlockedResponse: true,
          },
          dateContext: {},
        });
        return await finalize(blocked.response, blocked.evidencePatch);
      }

      const payloadResult = this.buildChannexCertificationTestCasePayload({ readiness, testCase });
      if (!payloadResult.ok) {
        return await finalize(payloadResult.result, {
          integrationAccountId: readiness.integrationAccountId ?? null,
          status: "BLOCKED",
          overallSuccess: false,
          mappingSnapshot,
          errors: payloadResult.result.response?.failures ?? [],
          notes: baseNotes,
          rawDetails: {
            readiness,
            testCaseId,
            testCase,
          },
        });
      }

      const credentialContext = await this.resolveChannexSyncCredentialContext({
        userId: normalizedUserId,
        mappingSnapshot,
        groupedPayloads: summarizeChannexGroupedPayloads(payloadResult.payloads),
        baseNotes,
        payloadPreview: {
          testCaseId,
          testCaseName: testCase.title,
          payloadType: testCase.payloadType,
        },
      });
      if (!credentialContext.ok) {
        return await finalize(credentialContext.response, credentialContext.evidencePatch, payloadResult.dateRange);
      }

      const { integration, secret } = credentialContext;
      const providerResult =
        testCase.payloadType === "availability"
          ? await this.channexProviderClient.pushAvailability(secret, payloadResult.payloads)
          : await this.channexProviderClient.pushRestrictions(secret, payloadResult.payloads, { stopOnFailure: true });
      const results = Array.isArray(providerResult?.results) ? providerResult.results : [];
      const formattedResults =
        testCase.payloadType === "availability"
          ? results.map((result) => formatChannexAvailabilityProviderResult(result))
          : results.map((result) => formatChannexRestrictionProviderResult(result));
      const hasWarnings = resultListHasWarnings(formattedResults);
      const hasErrors = resultListHasErrors(formattedResults) || hasWarnings;
      const responseBody = {
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        testCaseId,
        testCaseName: testCase.title,
        syncMode: "changeUpdate",
        payloadType: testCase.payloadType,
        dateFrom: payloadResult.dateRange.dateFrom,
        dateTo: payloadResult.dateRange.dateTo,
        ready: true,
        calledProvider: true,
        requestCount: payloadResult.payloads.length,
        taskIds: collectTaskIdsFromResultList(formattedResults),
        results: formattedResults,
        overallSuccess: !hasErrors,
        notes: baseNotes,
        ...(hasErrors
          ? {
              error: "Failed to run Channex certification test case.",
              errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_SYNC_FAILED",
            }
          : {}),
      };
      const response = hasErrors ? bad(500, responseBody) : ok(responseBody);

      return await finalize(response, {
        integrationAccountId: integration.id,
        status: hasErrors ? "FAILED" : "SUCCESS",
        overallSuccess: !hasErrors,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: summarizeChannexGroupedPayloads(payloadResult.payloads),
        providerResponseSummary: {
          calledProvider: true,
          requestCount: payloadResult.payloads.length,
          results: formattedResults,
        },
        taskIds: collectTaskIdsFromResultList(formattedResults),
        warnings: collectWarningsFromResultList(formattedResults),
        errors: collectErrorsFromResultList(formattedResults),
        notes: baseNotes,
        rawDetails: {
          testCaseId,
          testCase,
          providerResult: {
            success: !!providerResult?.success,
            resultCount: results.length,
            results: formattedResults,
            rawRequestBodiesOmitted: true,
          },
        },
      }, payloadResult.dateRange);
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(bad(500, {
        error: "Failed to run Channex certification test case.",
        errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_SYNC_FAILED",
        details,
      }), {
        status: "FAILED",
        overallSuccess: false,
        errors: [
          {
            errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_SYNC_FAILED",
            errorMessage: "Failed to run Channex certification test case.",
            details,
          },
        ],
        rawDetails: { caughtError: details, testCaseId },
      });
    }
  }
}
