const CHANNEX_CALENDAR_CHANGE_SYNC_TYPE = "calendar-change";
const CHANNEX_CALENDAR_CHANGE_TYPES = Object.freeze({
  AVAILABILITY: "availability",
  RATES: "rates",
  RESTRICTIONS: "restrictions",
});
const CHANNEX_CALENDAR_CHANGE_TYPE_ALIASES = new Map([
  ["availability", CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY],
  ["available", CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY],
  ["isavailable", CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY],
  ["rates", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["rate", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["pricing", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["price", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["restrictions", CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS],
  ["restriction", CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS],
]);
const CHANNEX_SUPPORTED_RESTRICTION_FIELDS = [
  "closed_to_arrival",
  "closed_to_departure",
  "stop_sell",
  "max_stay",
  "min_stay_through",
];

const nowMs = () => Date.now();
const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const compareAlphabetically = (left, right) => String(left).localeCompare(String(right));
const parseIsoDateParam = (value) => {
  const normalized = requireStr(value);
  if (!normalized) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
};
const normalizeChannexCalendarChangeTypes = (changeTypes) =>
  Array.from(
    new Set(
      (Array.isArray(changeTypes) ? changeTypes : [changeTypes])
        .map((changeType) => requireStr(changeType)?.toLowerCase().replaceAll(/[^a-z]/g, ""))
        .map((changeType) => CHANNEX_CALENDAR_CHANGE_TYPE_ALIASES.get(changeType))
        .filter(Boolean)
    )
  ).sort(compareAlphabetically);
const normalizeChannexCalendarChangeDates = (changedDates) =>
  Array.from(
    new Set(
      (Array.isArray(changedDates) ? changedDates : [])
        .map((date) => parseIsoDateParam(date))
        .filter(Boolean)
    )
  ).sort(compareAlphabetically);
const buildChannexCalendarChangeDateContext = (body) => {
  const changedDates = normalizeChannexCalendarChangeDates(body?.changedDates);
  if (changedDates.length) {
    return {
      changedDates,
      dateFrom: changedDates[0],
      dateTo: changedDates.at(-1),
      exactDateSet: new Set(changedDates),
    };
  }

  const dateFrom = parseIsoDateParam(body?.dateFrom);
  const dateTo = parseIsoDateParam(body?.dateTo);
  return {
    changedDates: [],
    dateFrom,
    dateTo,
    exactDateSet: null,
  };
};
const filterChannexPayloadValuesByDate = (payloads, exactDateSet) =>
  (Array.isArray(payloads) ? payloads : [])
    .map((payload) => ({
      ...payload,
      values: (Array.isArray(payload?.values) ? payload.values : []).filter(
        (value) => !exactDateSet || exactDateSet.has(value?.date)
      ),
    }))
    .filter((payload) => payload.values.length > 0);
const buildChannexCalendarRestrictionSyncValue = (value, changeTypes) => {
  const includeRates = changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RATES);
  const includeRestrictions = changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS);
  const out = {
    property_id: value.property_id,
    rate_plan_id: value.rate_plan_id,
    date: value.date,
  };

  if (includeRates && Object.hasOwn(value || {}, "rate")) {
    out.rate = value.rate;
  }

  if (includeRestrictions) {
    for (const field of CHANNEX_SUPPORTED_RESTRICTION_FIELDS) {
      if (Object.hasOwn(value || {}, field)) {
        out[field] = value[field];
      }
    }
  }

  return Object.keys(out).length > 3 ? out : null;
};
const buildChannexCalendarRestrictionSyncPayloads = ({ payloads, changeTypes, exactDateSet }) =>
  filterChannexPayloadValuesByDate(payloads, exactDateSet)
    .map((payload) => ({
      ...payload,
      values: payload.values
        .map((value) => buildChannexCalendarRestrictionSyncValue(value, changeTypes))
        .filter(Boolean),
    }))
    .filter((payload) => payload.values.length > 0);

export default class ChannexAvailabilitySyncService {
  constructor({
    channexBookingAvailabilityBridge,
    channexProviderClient,
    createChannexSyncFinalizer,
    buildSyncDateRangeValidationFailure,
    appendMissingMappingNotes,
    getChannexAriTargets,
    buildChannexAriTargetsFailureEvidencePatch,
    buildChannexMultiStepMappingSnapshot,
    buildChannexFullSyncAvailabilityPayloadContext,
    buildChannexFullSyncPayloadContext,
    resolveChannexSyncCredentialContext,
    summarizeChannexGroupedPayloads,
    formatChannexAvailabilityProviderResult,
    formatChannexRestrictionProviderResult,
    collectTaskIdsFromResultList,
    collectWarningsFromResultList,
    collectErrorsFromResultList,
    resultListHasErrors,
    resultListHasWarnings,
    deriveEvidenceOutcome,
    describeLocalError,
  }) {
    this.channexBookingAvailabilityBridge = channexBookingAvailabilityBridge;
    this.channexProviderClient = channexProviderClient;
    this.createChannexSyncFinalizer = createChannexSyncFinalizer;
    this.buildSyncDateRangeValidationFailure = buildSyncDateRangeValidationFailure;
    this.appendMissingMappingNotes = appendMissingMappingNotes;
    this.getChannexAriTargets = getChannexAriTargets;
    this.buildChannexAriTargetsFailureEvidencePatch =
      buildChannexAriTargetsFailureEvidencePatch;
    this.buildChannexMultiStepMappingSnapshot = buildChannexMultiStepMappingSnapshot;
    this.buildChannexFullSyncAvailabilityPayloadContext =
      buildChannexFullSyncAvailabilityPayloadContext;
    this.buildChannexFullSyncPayloadContext = buildChannexFullSyncPayloadContext;
    this.resolveChannexSyncCredentialContext = resolveChannexSyncCredentialContext;
    this.summarizeChannexGroupedPayloads = summarizeChannexGroupedPayloads;
    this.formatChannexAvailabilityProviderResult =
      formatChannexAvailabilityProviderResult;
    this.formatChannexRestrictionProviderResult =
      formatChannexRestrictionProviderResult;
    this.collectTaskIdsFromResultList = collectTaskIdsFromResultList;
    this.collectWarningsFromResultList = collectWarningsFromResultList;
    this.collectErrorsFromResultList = collectErrorsFromResultList;
    this.resultListHasErrors = resultListHasErrors;
    this.resultListHasWarnings = resultListHasWarnings;
    this.deriveEvidenceOutcome = deriveEvidenceOutcome;
    this.describeLocalError = describeLocalError;
  }

  async syncChannexBookingAvailability(body = {}) {
    const evidence =
      await this.channexBookingAvailabilityBridge.syncAvailabilityForBookingChange(body);
    return ok(evidence);
  }

  buildChannexCalendarChangeContext(body = {}) {
    const startedAt = nowMs();
    return {
      startedAt,
      normalizedUserId: requireStr(body?.userId),
      normalizedDomitsPropertyId: requireStr(body?.domitsPropertyId),
      source: requireStr(body?.source) || "HOST_CALENDAR_CHANGED",
      changeTypes: normalizeChannexCalendarChangeTypes(body?.changeTypes),
      dateContext: buildChannexCalendarChangeDateContext(body),
      rawDateFrom: body?.dateFrom,
      rawDateTo: body?.dateTo,
    };
  }

  createChannexCalendarChangeFinalizer(context, options) {
    return this.createChannexSyncFinalizer({
      normalizedUserId: context.normalizedUserId,
      normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
      normalizedDateFrom: context.dateContext.dateFrom,
      normalizedDateTo: context.dateContext.dateTo,
      rawDateFrom: context.rawDateFrom,
      rawDateTo: context.rawDateTo,
      startedAt: context.startedAt,
      syncType: CHANNEX_CALENDAR_CHANGE_SYNC_TYPE,
      options,
    });
  }

  buildChannexCalendarChangeValidationFailure(context) {
    if (!context.normalizedUserId) {
      return {
        response: bad(400, { error: "Missing required field: userId" }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [{ errorCode: "MISSING_USER_ID", errorMessage: "Missing required field: userId" }],
        },
      };
    }
    if (!context.normalizedDomitsPropertyId) {
      return {
        response: bad(400, { error: "Missing required field: domitsPropertyId" }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [
            { errorCode: "MISSING_DOMITS_PROPERTY_ID", errorMessage: "Missing required field: domitsPropertyId" },
          ],
        },
      };
    }
    if (
      !context.dateContext.dateFrom ||
      !context.dateContext.dateTo ||
      context.dateContext.dateFrom > context.dateContext.dateTo
    ) {
      return {
        response: bad(400, { error: "Invalid or missing calendar-change date range." }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [
            {
              errorCode: "CHANNEX_CALENDAR_CHANGE_DATE_RANGE_INVALID",
              errorMessage: "Calendar-change sync needs changedDates or a valid dateFrom/dateTo range.",
            },
          ],
        },
      };
    }
    const validationFailure = this.buildSyncDateRangeValidationFailure({
      normalizedUserId: context.normalizedUserId,
      normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
      normalizedDateFrom: context.dateContext.dateFrom,
      normalizedDateTo: context.dateContext.dateTo,
    });
    if (validationFailure) return validationFailure;
    if (!context.changeTypes.length) {
      return {
        response: bad(400, { error: "Missing required field: changeTypes" }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [
            {
              errorCode: "CHANNEX_CALENDAR_CHANGE_TYPES_MISSING",
              errorMessage: "Calendar-change sync needs at least one supported change type.",
            },
          ],
        },
      };
    }
    return null;
  }

  getChannexCalendarChangeBaseNotes() {
    return [
      "Host calendar change-only sync. This endpoint sends only the Channex provider payloads needed for the changed calendar fields.",
      "Availability values are rebuilt from Domits effective availability, including active booking occupancy, before sending to Channex.",
    ];
  }

  buildChannexCalendarChangeBlockedResult({ readiness, context, baseNotes, mappingSnapshot }) {
    const response = ok({
      channel: readiness.channel || "CHANNEX",
      integrationAccountId: readiness.integrationAccountId || null,
      domitsPropertyId: context.normalizedDomitsPropertyId,
      source: context.source,
      dateFrom: context.dateContext.dateFrom,
      dateTo: context.dateContext.dateTo,
      changedDates: context.dateContext.changedDates,
      changeTypes: context.changeTypes,
      requestTypes: [],
      ready: false,
      calledProvider: false,
      requestCount: 0,
      taskIds: [],
      warnings: [],
      errors: [],
      overallSuccess: false,
      missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
      notes: this.appendMissingMappingNotes(baseNotes, readiness.missingMappings),
    });
    return {
      response,
      evidencePatch: {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: { availability: [], restrictions: [] },
        providerResponseSummary: { calledProvider: false, requestCount: 0, results: [] },
        notes: response.response.notes,
        rawDetails: {
          readiness,
          source: context.source,
          changeTypes: context.changeTypes,
          changedDates: context.dateContext.changedDates,
        },
      },
    };
  }

  async buildChannexCalendarChangePayloadPlan({ readiness, context }) {
    const needsAvailability = context.changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY);
    const needsRestrictionsOrRates =
      context.changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS) ||
      context.changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RATES);
    const availabilityContext = needsAvailability
      ? await this.buildChannexFullSyncAvailabilityPayloadContext({
          readiness,
          normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
          normalizedDateFrom: context.dateContext.dateFrom,
          normalizedDateTo: context.dateContext.dateTo,
        })
      : null;
    const fullPayloadContext = needsRestrictionsOrRates
      ? await this.buildChannexFullSyncPayloadContext({
          readiness,
          normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
          normalizedDateFrom: context.dateContext.dateFrom,
          normalizedDateTo: context.dateContext.dateTo,
        })
      : null;
    const availabilityPayloads = needsAvailability
      ? filterChannexPayloadValuesByDate(
          availabilityContext?.availabilityProviderPayloads,
          context.dateContext.exactDateSet
        )
      : [];
    const restrictionPayloads = needsRestrictionsOrRates
      ? buildChannexCalendarRestrictionSyncPayloads({
          payloads: fullPayloadContext?.restrictionProviderPayloads,
          changeTypes: context.changeTypes,
          exactDateSet: context.dateContext.exactDateSet,
        })
      : [];
    return {
      availabilityContext,
      fullPayloadContext,
      availabilityPayloads,
      restrictionPayloads,
      requestTypes: [
        ...(availabilityPayloads.length ? ["availability"] : []),
        ...(restrictionPayloads.length ? ["restrictions/rates"] : []),
      ],
    };
  }

  buildChannexCalendarChangeNoopResult({ readiness, context, baseNotes, mappingSnapshot, payloadPlan }) {
    const response = ok({
      channel: "CHANNEX",
      integrationAccountId: readiness.integrationAccountId ?? null,
      domitsPropertyId: context.normalizedDomitsPropertyId,
      source: context.source,
      dateFrom: context.dateContext.dateFrom,
      dateTo: context.dateContext.dateTo,
      changedDates: context.dateContext.changedDates,
      changeTypes: context.changeTypes,
      requestTypes: [],
      ready: true,
      calledProvider: false,
      requestCount: 0,
      taskIds: [],
      warnings: [],
      errors: [],
      overallSuccess: false,
      notes: [
        ...baseNotes,
        "No Channex provider values were generated for the requested host calendar change.",
      ],
    });
    return {
      response,
      evidencePatch: {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "NOOP",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: { availability: [], restrictions: [] },
        providerResponseSummary: { calledProvider: false, requestCount: 0, results: [] },
        notes: response.response.notes,
        rawDetails: {
          source: context.source,
          changeTypes: context.changeTypes,
          changedDates: context.dateContext.changedDates,
          availabilityPayloadSummary: payloadPlan.availabilityContext?.availabilityPayloadSummary ?? [],
          restrictionsPayloadSummary: payloadPlan.fullPayloadContext?.restrictionsPayloadSummary ?? [],
        },
      },
    };
  }

  async pushChannexCalendarChangeStep({ secret, step, payloads, options }) {
    const providerResult =
      step === "availability"
        ? await this.channexProviderClient.pushAvailability(secret, payloads, {
            requestTimeoutMs: options?.providerRequestTimeoutMs,
            stopOnFailure: true,
          })
        : await this.channexProviderClient.pushRestrictions(secret, payloads, {
            requestTimeoutMs: options?.providerRequestTimeoutMs,
            stopOnFailure: true,
          });
    const formatter =
      step === "availability"
        ? this.formatChannexAvailabilityProviderResult
        : this.formatChannexRestrictionProviderResult;
    const results = (Array.isArray(providerResult?.results) ? providerResult.results : []).map(formatter);
    return {
      step: step === "availability" ? "availability" : "restrictions/rates",
      requestCount: payloads.length,
      results,
      taskIds: this.collectTaskIdsFromResultList(results),
      warnings: this.collectWarningsFromResultList(results),
      errors: this.collectErrorsFromResultList(results),
    };
  }

  async collectChannexCalendarChangeProviderSteps({ secret, payloadPlan, options }) {
    const steps = [];
    if (payloadPlan.availabilityPayloads.length) {
      steps.push(
        await this.pushChannexCalendarChangeStep({
          secret,
          step: "availability",
          payloads: payloadPlan.availabilityPayloads,
          options,
        })
      );
    }
    if (payloadPlan.restrictionPayloads.length) {
      steps.push(
        await this.pushChannexCalendarChangeStep({
          secret,
          step: "restrictions",
          payloads: payloadPlan.restrictionPayloads,
          options,
        })
      );
    }
    return steps;
  }

  buildChannexCalendarChangeProviderResult({ integration, context, baseNotes, mappingSnapshot, payloadPlan, providerSteps }) {
    const allResults = providerSteps.flatMap((step) => step.results);
    const taskIds = this.collectTaskIdsFromResultList(allResults);
    const warnings = this.collectWarningsFromResultList(allResults);
    const errors = this.collectErrorsFromResultList(allResults);
    const hasErrors = this.resultListHasErrors(allResults);
    const hasWarnings = this.resultListHasWarnings(allResults);
    const overallSuccess = !hasErrors && !hasWarnings;
    const requestCount = payloadPlan.availabilityPayloads.length + payloadPlan.restrictionPayloads.length;
    const responseBody = {
      channel: "CHANNEX",
      integrationAccountId: integration.id,
      domitsPropertyId: context.normalizedDomitsPropertyId,
      source: context.source,
      syncType: CHANNEX_CALENDAR_CHANGE_SYNC_TYPE,
      dateFrom: context.dateContext.dateFrom,
      dateTo: context.dateContext.dateTo,
      changedDates: context.dateContext.changedDates,
      changeTypes: context.changeTypes,
      requestTypes: payloadPlan.requestTypes,
      ready: true,
      calledProvider: true,
      requestCount,
      taskIds,
      warnings,
      errors,
      overallSuccess,
      steps: providerSteps,
      notes: baseNotes,
      ...(hasErrors
        ? {
            error: "Failed to sync Channex host calendar change.",
            errorCode: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED",
          }
        : {}),
    };
    const response = hasErrors ? bad(500, responseBody) : ok(responseBody);
    const outcome = this.deriveEvidenceOutcome({
      statusCode: response.statusCode,
      ready: true,
      calledProvider: true,
      results: allResults,
      overallSuccess,
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: integration.id,
        status: outcome.status,
        overallSuccess: outcome.overallSuccess && overallSuccess,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: this.summarizeChannexGroupedPayloads(payloadPlan.availabilityPayloads),
          restrictions: this.summarizeChannexGroupedPayloads(payloadPlan.restrictionPayloads),
        },
        providerResponseSummary: {
          calledProvider: true,
          requestCount,
          requestTypes: payloadPlan.requestTypes,
          results: allResults,
          steps: providerSteps,
        },
        taskIds,
        warnings,
        errors,
        notes: baseNotes,
        rawDetails: {
          source: context.source,
          changeTypes: context.changeTypes,
          changedDates: context.dateContext.changedDates,
          activeBookingCount:
            payloadPlan.availabilityContext?.activeBookingCount ?? payloadPlan.fullPayloadContext?.activeBookingCount ?? null,
          activeBookingNightCount:
            payloadPlan.availabilityContext?.activeBookingNightCount ??
            payloadPlan.fullPayloadContext?.activeBookingNightCount ??
            null,
        },
      },
    };
  }

  async runChannexCalendarChangeSync({ context, finalize, baseNotes, options }) {
    const readinessResult = await this.getChannexAriTargets(
      context.normalizedUserId,
      context.normalizedDomitsPropertyId
    );
    if (readinessResult?.statusCode !== 200) {
      return await finalize(readinessResult, this.buildChannexAriTargetsFailureEvidencePatch(readinessResult));
    }

    const readiness = readinessResult.response || {};
    const mappingSnapshot = this.buildChannexMultiStepMappingSnapshot(readiness);
    if (!readiness.ready) {
      const blocked = this.buildChannexCalendarChangeBlockedResult({
        readiness,
        context,
        baseNotes,
        mappingSnapshot,
      });
      return await finalize(blocked.response, blocked.evidencePatch);
    }

    const payloadPlan = await this.buildChannexCalendarChangePayloadPlan({ readiness, context });
    if (!payloadPlan.requestTypes.length) {
      const noop = this.buildChannexCalendarChangeNoopResult({
        readiness,
        context,
        baseNotes,
        mappingSnapshot,
        payloadPlan,
      });
      return await finalize(noop.response, noop.evidencePatch);
    }

    const credentialContext = await this.resolveChannexSyncCredentialContext({
      userId: context.normalizedUserId,
      mappingSnapshot,
      groupedPayloads: {
        availability: this.summarizeChannexGroupedPayloads(payloadPlan.availabilityPayloads),
        restrictions: this.summarizeChannexGroupedPayloads(payloadPlan.restrictionPayloads),
      },
      baseNotes,
      payloadPreview: {
        source: context.source,
        changeTypes: context.changeTypes,
        changedDates: context.dateContext.changedDates,
        dateFrom: context.dateContext.dateFrom,
        dateTo: context.dateContext.dateTo,
      },
    });
    if (!credentialContext.ok) {
      return await finalize(credentialContext.response, credentialContext.evidencePatch);
    }

    const providerSteps = await this.collectChannexCalendarChangeProviderSteps({
      secret: credentialContext.secret,
      payloadPlan,
      options,
    });
    const providerResult = this.buildChannexCalendarChangeProviderResult({
      integration: credentialContext.integration,
      context,
      baseNotes,
      mappingSnapshot,
      payloadPlan,
      providerSteps,
    });
    return await finalize(providerResult.response, providerResult.evidencePatch);
  }

  async syncChannexCalendarChange(body = {}, options = {}) {
    const context = this.buildChannexCalendarChangeContext(body);
    const finalize = this.createChannexCalendarChangeFinalizer(context, options);
    const validationFailure = this.buildChannexCalendarChangeValidationFailure(context);
    if (validationFailure) {
      return await finalize(validationFailure.response, validationFailure.evidencePatch);
    }

    const baseNotes = this.getChannexCalendarChangeBaseNotes();
    try {
      return await this.runChannexCalendarChangeSync({
        context,
        finalize,
        baseNotes,
        options,
      });
    } catch (error) {
      const details = this.describeLocalError(error);
      return await finalize(
        bad(500, {
          error: "Failed to sync Channex host calendar change.",
          errorCode: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED",
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED",
              errorMessage: "Failed to sync Channex host calendar change.",
              details,
            },
          ],
          rawDetails: {
            caughtError: details,
            source: context.source,
            changeTypes: context.changeTypes,
            changedDates: context.dateContext.changedDates,
          },
        }
      );
    }
  }

}
