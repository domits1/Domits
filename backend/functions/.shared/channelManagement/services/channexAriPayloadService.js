import ChannexMappingService from "./channexMappingService.js";
import { ChannexBookingAvailabilityRepository } from "../channexBookingAvailabilityBridge.js";
import {
  addDaysToIsoDate,
  buildCalendarDateRange,
  getUtcTodayIsoDate,
  isoDateToCalendarInt,
  parseIsoDateParam,
} from "../utils/channexAriDateUtils.js";
import {
  CHANNEX_CERTIFICATION_FULL_SYNC_DAYS,
  CHANNEX_FULL_SYNC_DEFAULTS,
  appendChannexAriPayloadPreviewNotes,
  buildAriPreviewCollections,
  buildAvailabilityOccupancyContext,
  buildAvailabilityPayloadGroups,
  buildAvailabilityPayloadItemsFromReadiness,
  buildCalendarOverrideMap,
  buildCalendarRestrictionOverrideSummary,
  buildChannexAvailabilitySyncPayloads,
  buildChannexPayloadPreviewPaginationContext,
  buildChannexRestrictionMapping,
  buildChannexRestrictionSyncPayloads,
  buildPreviewDateRangeValidationResponse,
  buildRestrictionRateItems,
  buildRestrictionRateItemsFromReadiness,
  buildRestrictionRatePayloadGroups,
  collectChannexRestrictionFieldsFromGroups,
  combineChannexAvailabilitySyncPayloadsForProvider,
  combineChannexRestrictionSyncPayloadsForProvider,
  createChannexAriPayloadPreviewNotes,
  createChannexAvailabilityPayloadPreviewNotes,
  createChannexRestrictionRatePayloadPreviewNotes,
  getPropertyAvailabilityRestrictions,
  getPropertyAvailabilityWindows,
  getPropertyCalendarOverrides,
  getPropertyPricing,
  normalizeAvailabilityRestrictionRows,
  normalizeAvailabilityWindows,
  summarizeChannexGroupedPayloads,
} from "../utils/channexAriPayloadUtils.js";

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const compareAlphabetically = (left, right) =>
  String(left).localeCompare(String(right));
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});

export default class ChannexAriPayloadService {
  constructor({
    channexMappingService = new ChannexMappingService(),
    bookingAvailabilityRepository = new ChannexBookingAvailabilityRepository(),
    getChannexAriTargets = (...args) =>
      channexMappingService.getChannexAriTargets(...args),
  } = {}) {
    this.channexMappingService = channexMappingService;
    this.bookingAvailabilityRepository = bookingAvailabilityRepository;
    this.getChannexAriTargets = getChannexAriTargets;
  }

  async previewChannexAri(userId, domitsPropertyId, dateFrom, dateTo) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);

    const validationResponse = buildPreviewDateRangeValidationResponse({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationResponse) return validationResponse;

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        return readinessResult;
      }

      const readiness = readinessResult.response || {};
      if (!readiness.ready) {
        return ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          ready: false,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
          propertyMapping: readiness.propertyMapping || null,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
          ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
          sourceSummary: null,
          availabilityPreview: [],
          rateRestrictionPreview: [],
        });
      }

      const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
      const endDateInt = isoDateToCalendarInt(normalizedDateTo);
      const [availabilityWindows, calendarOverrides, pricing, restrictions] = await Promise.all([
        getPropertyAvailabilityWindows(normalizedDomitsPropertyId),
        getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
        getPropertyPricing(normalizedDomitsPropertyId),
        getPropertyAvailabilityRestrictions(normalizedDomitsPropertyId),
      ]);

      const normalizedAvailabilityWindows = normalizeAvailabilityWindows(availabilityWindows);
      const overrideMap = buildCalendarOverrideMap(calendarOverrides);
      const normalizedRestrictions = normalizeAvailabilityRestrictionRows(restrictions);
      const restrictionMapping = buildChannexRestrictionMapping(normalizedRestrictions);

      const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
      const occupancyContext = await buildAvailabilityOccupancyContext({
        bookingAvailabilityRepository: this.bookingAvailabilityRepository,
        domitsPropertyId: normalizedDomitsPropertyId,
        dates,
      });
      const calendarRestrictionOverrideDates = Array.from(overrideMap.values()).filter(
        (override) => buildCalendarRestrictionOverrideSummary(override).hasAnyValue
      ).length;
      const {
        availabilityPreview,
        rateRestrictionPreview,
        supportedCalendarRestrictionOverrideFields,
        effectiveChannexRestrictionFields,
      } = buildAriPreviewCollections({
        dates,
        overrideMap,
        restrictionMapping,
        normalizedAvailabilityWindows,
        pricing,
        readiness,
        normalizedDomitsPropertyId,
        normalizedRestrictions,
        activeCountsByNight: occupancyContext.activeCountsByNight,
      });

      return ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId: readiness.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        ready: true,
        missingMappings: [],
        propertyMapping: readiness.propertyMapping || null,
        roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
        ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
        sourceSummary: {
          propertyAvailabilityWindows: normalizedAvailabilityWindows.length,
          calendarOverrides: overrideMap.size,
          hasBasePricing: !!pricing,
          availabilityRestrictions: normalizedRestrictions.length,
          supportedAvailabilityRestrictions: restrictionMapping.supportedRestrictions.length,
          globalSupportedChannexRestrictionFields: restrictionMapping.supportedChannexRestrictionFields,
          calendarRestrictionOverrides: calendarRestrictionOverrideDates,
          supportedCalendarRestrictionOverrideFields: Array.from(supportedCalendarRestrictionOverrideFields).sort(compareAlphabetically),
          supportedChannexRestrictionFields: Array.from(effectiveChannexRestrictionFields).sort(compareAlphabetically),
          omittedAvailabilityRestrictions: restrictionMapping.omittedRestrictions.length,
          omittedDomitsRestrictionNames: restrictionMapping.omittedDomitsRestrictionNames,
          bookingAwareAvailability: true,
          activeBookingCount: occupancyContext.activeBookingCount,
          activeBookingNightCount: occupancyContext.activeBookingNightCount,
          sellableUnitCount: CHANNEX_FULL_SYNC_DEFAULTS.DEFAULT_SELLABLE_UNIT_COUNT,
        },
        availabilityPreview,
        rateRestrictionPreview,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to build Channex ARI preview.",
        errorCode: "CHANNEX_ARI_PREVIEW_FAILED",
        details,
      });
    }
  }

  async previewChannexAriPayloads(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);

    const validationResponse = buildPreviewDateRangeValidationResponse({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationResponse) return validationResponse;

    const paginationContext = options?.paginate
      ? buildChannexPayloadPreviewPaginationContext({
          normalizedDateFrom,
          normalizedDateTo,
          pageDateFrom: options.pageDateFrom,
          pageSizeDays: options.pageSizeDays,
        })
      : {
          pageDateFrom: normalizedDateFrom,
          pageDateTo: normalizedDateTo,
          pagination: null,
        };
    if (paginationContext.error) return paginationContext.error;

    try {
      const previewResult = await this.previewChannexAri(
        normalizedUserId,
        normalizedDomitsPropertyId,
        paginationContext.pageDateFrom,
        paginationContext.pageDateTo
      );
      if (previewResult?.statusCode !== 200) {
        return previewResult;
      }

      const preview = previewResult.response || {};
      const notes = createChannexAriPayloadPreviewNotes();

      if (!preview.ready) {
        return ok({
          channel: preview.channel || "CHANNEX",
          integrationAccountId: preview.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          pagination: paginationContext.pagination,
          ready: false,
          missingMappings: Array.isArray(preview.missingMappings) ? preview.missingMappings : [],
          sourceSummary: preview.sourceSummary ?? null,
          availabilityPayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          restrictionRatePayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          notes,
        });
      }

      appendChannexAriPayloadPreviewNotes(notes, preview);

      const availabilityItems = (Array.isArray(preview.availabilityPreview) ? preview.availabilityPreview : []).map((item) => ({
        externalPropertyId: item.externalPropertyId,
        externalRoomTypeId: item.externalRoomTypeId,
        date: item.date,
        availability: item.availability,
        baseAvailability: item.baseAvailability,
        activeBookingCount: item.activeBookingCount,
        sellableUnitCount: item.sellableUnitCount,
        availableUnitCount: item.availableUnitCount,
      }));
      const availabilityPayloadGroups = buildAvailabilityPayloadGroups(availabilityItems);

      const restrictionRateItems = buildRestrictionRateItems(preview.rateRestrictionPreview);
      const restrictionRatePayloadGroups = buildRestrictionRatePayloadGroups(restrictionRateItems);

      return ok({
        channel: preview.channel || "CHANNEX",
        integrationAccountId: preview.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        pagination: paginationContext.pagination,
        ready: true,
        missingMappings: Array.isArray(preview.missingMappings) ? preview.missingMappings : [],
        sourceSummary: preview.sourceSummary ?? null,
        availabilityPayloadPreview: {
          items: availabilityItems,
          groupedPayloads: availabilityPayloadGroups,
        },
        restrictionRatePayloadPreview: {
          items: restrictionRateItems,
          groupedPayloads: restrictionRatePayloadGroups,
        },
        notes,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to build Channex ARI payload preview.",
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_FAILED",
        details,
      });
    }
  }

  async previewChannexAvailabilityPayloads(userId, domitsPropertyId, dateFrom, dateTo) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);

    const validationResponse = buildPreviewDateRangeValidationResponse({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationResponse) return validationResponse;

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        return readinessResult;
      }

      const readiness = readinessResult.response || {};
      const notes = createChannexAvailabilityPayloadPreviewNotes();
      if (!readiness.ready) {
        return ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          pagination: null,
          ready: false,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
          propertyMapping: readiness.propertyMapping || null,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
          ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
          sourceSummary: null,
          availabilityPayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          restrictionRatePayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          notes,
        });
      }

      const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
      const endDateInt = isoDateToCalendarInt(normalizedDateTo);
      const [availabilityWindows, calendarOverrides] = await Promise.all([
        getPropertyAvailabilityWindows(normalizedDomitsPropertyId),
        getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
      ]);

      const normalizedAvailabilityWindows = normalizeAvailabilityWindows(availabilityWindows);
      const overrideMap = buildCalendarOverrideMap(calendarOverrides);
      const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
      const occupancyContext = await buildAvailabilityOccupancyContext({
        bookingAvailabilityRepository: this.bookingAvailabilityRepository,
        domitsPropertyId: normalizedDomitsPropertyId,
        dates,
      });
      const availabilityItems = buildAvailabilityPayloadItemsFromReadiness({
        dates,
        overrideMap,
        normalizedAvailabilityWindows,
        readiness,
        normalizedDomitsPropertyId,
        activeCountsByNight: occupancyContext.activeCountsByNight,
      }).map((item) => ({
        externalPropertyId: item.externalPropertyId,
        externalRoomTypeId: item.externalRoomTypeId,
        date: item.date,
        availability: item.availability,
        baseAvailability: item.baseAvailability,
        activeBookingCount: item.activeBookingCount,
        sellableUnitCount: item.sellableUnitCount,
        availableUnitCount: item.availableUnitCount,
      }));
      const availabilityPayloadGroups = buildAvailabilityPayloadGroups(availabilityItems);

      return ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId: readiness.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        pagination: null,
        ready: true,
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        sourceSummary: {
          propertyAvailabilityWindows: normalizedAvailabilityWindows.length,
          calendarOverrides: overrideMap.size,
          requestedDays: dates.length,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings.length : 0,
          availabilityPayloadGroups: availabilityPayloadGroups.length,
          availabilityPayloadItems: availabilityItems.length,
          bookingAwareAvailability: true,
          activeBookingCount: occupancyContext.activeBookingCount,
          activeBookingNightCount: occupancyContext.activeBookingNightCount,
          sellableUnitCount: CHANNEX_FULL_SYNC_DEFAULTS.DEFAULT_SELLABLE_UNIT_COUNT,
        },
        availabilityPayloadPreview: {
          items: availabilityItems,
          groupedPayloads: availabilityPayloadGroups,
        },
        restrictionRatePayloadPreview: {
          items: [],
          groupedPayloads: [],
        },
        notes,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to build Channex availability payload preview.",
        errorCode: "CHANNEX_AVAILABILITY_PAYLOAD_PREVIEW_FAILED",
        details,
      });
    }
  }

  async previewChannexRestrictionRatePayloads(userId, domitsPropertyId, dateFrom, dateTo) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);

    const validationResponse = buildPreviewDateRangeValidationResponse({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationResponse) return validationResponse;

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        return readinessResult;
      }

      const readiness = readinessResult.response || {};
      const notes = createChannexRestrictionRatePayloadPreviewNotes();
      if (!readiness.ready) {
        return ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          pagination: null,
          ready: false,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
          propertyMapping: readiness.propertyMapping || null,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
          ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
          sourceSummary: null,
          availabilityPayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          restrictionRatePayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          notes,
        });
      }

      const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
      const endDateInt = isoDateToCalendarInt(normalizedDateTo);
      const [calendarOverrides, pricing, restrictions] = await Promise.all([
        getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
        getPropertyPricing(normalizedDomitsPropertyId),
        getPropertyAvailabilityRestrictions(normalizedDomitsPropertyId),
      ]);

      const overrideMap = buildCalendarOverrideMap(calendarOverrides);
      const normalizedRestrictions = normalizeAvailabilityRestrictionRows(restrictions);
      const restrictionMapping = buildChannexRestrictionMapping(normalizedRestrictions);
      const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
      const calendarRestrictionOverrideDates = Array.from(overrideMap.values()).filter(
        (override) => buildCalendarRestrictionOverrideSummary(override).hasAnyValue
      ).length;
      const {
        restrictionRateItems,
        supportedCalendarRestrictionOverrideFields,
        effectiveChannexRestrictionFields,
      } = buildRestrictionRateItemsFromReadiness({
        dates,
        overrideMap,
        restrictionMapping,
        pricing,
        readiness,
        normalizedDomitsPropertyId,
        normalizedRestrictions,
      });
      const restrictionRatePayloadGroups = buildRestrictionRatePayloadGroups(restrictionRateItems);
      const sourceSummary = {
        calendarOverrides: overrideMap.size,
        hasBasePricing: !!pricing,
        availabilityRestrictions: normalizedRestrictions.length,
        supportedAvailabilityRestrictions: restrictionMapping.supportedRestrictions.length,
        globalSupportedChannexRestrictionFields: restrictionMapping.supportedChannexRestrictionFields,
        calendarRestrictionOverrides: calendarRestrictionOverrideDates,
        supportedCalendarRestrictionOverrideFields: Array.from(supportedCalendarRestrictionOverrideFields).sort(compareAlphabetically),
        supportedChannexRestrictionFields: Array.from(effectiveChannexRestrictionFields).sort(compareAlphabetically),
        omittedAvailabilityRestrictions: restrictionMapping.omittedRestrictions.length,
        omittedDomitsRestrictionNames: restrictionMapping.omittedDomitsRestrictionNames,
        requestedDays: dates.length,
        ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings.length : 0,
        restrictionRatePayloadGroups: restrictionRatePayloadGroups.length,
        restrictionRatePayloadItems: restrictionRateItems.length,
      };

      appendChannexAriPayloadPreviewNotes(notes, { sourceSummary });

      return ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId: readiness.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        pagination: null,
        ready: true,
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        sourceSummary,
        availabilityPayloadPreview: {
          items: [],
          groupedPayloads: [],
        },
        restrictionRatePayloadPreview: {
          items: restrictionRateItems,
          groupedPayloads: restrictionRatePayloadGroups,
        },
        notes,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to build Channex restriction/rate payload preview.",
        errorCode: "CHANNEX_RESTRICTION_RATE_PAYLOAD_PREVIEW_FAILED",
        details,
      });
    }
  }

  normalizeChannexFullSyncDateContext(dateFrom, dateTo) {
    const rawDateFrom = requireStr(dateFrom);
    const rawDateTo = requireStr(dateTo);
    const usingDefaultDateRange = !rawDateFrom && !rawDateTo;
    const defaultStartDate = usingDefaultDateRange ? getUtcTodayIsoDate() : null;

    return {
      rawDateFrom,
      rawDateTo,
      usingDefaultDateRange,
      normalizedDateFrom: usingDefaultDateRange ? defaultStartDate : parseIsoDateParam(rawDateFrom),
      normalizedDateTo: usingDefaultDateRange
        ? addDaysToIsoDate(defaultStartDate, CHANNEX_CERTIFICATION_FULL_SYNC_DAYS - 1)
        : parseIsoDateParam(rawDateTo),
    };
  }

  async buildChannexFullSyncPayloadContext({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
  }) {
    const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
    const endDateInt = isoDateToCalendarInt(normalizedDateTo);
    const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
    const [availabilityWindows, calendarOverrides, pricing, restrictions] = await Promise.all([
      getPropertyAvailabilityWindows(normalizedDomitsPropertyId),
      getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
      getPropertyPricing(normalizedDomitsPropertyId),
      getPropertyAvailabilityRestrictions(normalizedDomitsPropertyId),
    ]);
    const normalizedAvailabilityWindows = normalizeAvailabilityWindows(availabilityWindows);
    const overrideMap = buildCalendarOverrideMap(calendarOverrides);
    const normalizedRestrictions = normalizeAvailabilityRestrictionRows(restrictions);
    const restrictionMapping = buildChannexRestrictionMapping(normalizedRestrictions);
    const occupancyContext = await buildAvailabilityOccupancyContext({
      bookingAvailabilityRepository: this.bookingAvailabilityRepository,
      domitsPropertyId: normalizedDomitsPropertyId,
      dates,
    });

    const availabilityItems = buildAvailabilityPayloadItemsFromReadiness({
      dates,
      overrideMap,
      normalizedAvailabilityWindows,
      readiness,
      normalizedDomitsPropertyId,
      activeCountsByNight: occupancyContext.activeCountsByNight,
    });
    const availabilityGroupedPayloads = buildAvailabilityPayloadGroups(availabilityItems);
    const availabilityProviderPayloads = combineChannexAvailabilitySyncPayloadsForProvider(
      buildChannexAvailabilitySyncPayloads(availabilityGroupedPayloads)
    );

    const {
      restrictionRateItems,
      supportedCalendarRestrictionOverrideFields,
      effectiveChannexRestrictionFields,
    } = buildRestrictionRateItemsFromReadiness({
      dates,
      overrideMap,
      restrictionMapping,
      pricing,
      readiness,
      normalizedDomitsPropertyId,
      normalizedRestrictions,
      includeSnapshotBooleanRestrictions: true,
    });
    const restrictionRateGroupedPayloads = buildRestrictionRatePayloadGroups(restrictionRateItems);
    const restrictionProviderPayloads = combineChannexRestrictionSyncPayloadsForProvider(
      buildChannexRestrictionSyncPayloads(restrictionRateGroupedPayloads)
    );

    return {
      dates,
      availabilityItems,
      availabilityGroupedPayloads,
      availabilityProviderPayloads,
      restrictionRateItems,
      restrictionRateGroupedPayloads,
      restrictionProviderPayloads,
      supportedCalendarRestrictionOverrideFields: Array.from(supportedCalendarRestrictionOverrideFields).sort(
        compareAlphabetically
      ),
      effectiveChannexRestrictionFields: Array.from(effectiveChannexRestrictionFields).sort(compareAlphabetically),
      sentChannexRestrictionFields: collectChannexRestrictionFieldsFromGroups(restrictionProviderPayloads),
      bookingAwareAvailability: true,
      activeBookingCount: occupancyContext.activeBookingCount,
      activeBookingNightCount: occupancyContext.activeBookingNightCount,
      availabilityPayloadSummary: summarizeChannexGroupedPayloads(availabilityProviderPayloads),
      restrictionsPayloadSummary: summarizeChannexGroupedPayloads(restrictionProviderPayloads),
    };
  }

  async buildChannexFullSyncAvailabilityPayloadContext({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
  }) {
    const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
    const endDateInt = isoDateToCalendarInt(normalizedDateTo);
    const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
    const [availabilityWindows, calendarOverrides] = await Promise.all([
      getPropertyAvailabilityWindows(normalizedDomitsPropertyId),
      getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
    ]);
    const occupancyContext = await buildAvailabilityOccupancyContext({
      bookingAvailabilityRepository: this.bookingAvailabilityRepository,
      domitsPropertyId: normalizedDomitsPropertyId,
      dates,
    });
    const availabilityItems = buildAvailabilityPayloadItemsFromReadiness({
      dates,
      overrideMap: buildCalendarOverrideMap(calendarOverrides),
      normalizedAvailabilityWindows: normalizeAvailabilityWindows(availabilityWindows),
      readiness,
      normalizedDomitsPropertyId,
      activeCountsByNight: occupancyContext.activeCountsByNight,
    });
    const availabilityGroupedPayloads = buildAvailabilityPayloadGroups(availabilityItems);
    const availabilityProviderPayloads = combineChannexAvailabilitySyncPayloadsForProvider(
      buildChannexAvailabilitySyncPayloads(availabilityGroupedPayloads)
    );

    return {
      dates,
      availabilityItems,
      availabilityGroupedPayloads,
      availabilityProviderPayloads,
      bookingAwareAvailability: true,
      activeBookingCount: occupancyContext.activeBookingCount,
      activeBookingNightCount: occupancyContext.activeBookingNightCount,
      availabilityPayloadSummary: summarizeChannexGroupedPayloads(availabilityProviderPayloads),
    };
  }

  async buildChannexFullSyncRestrictionsPayloadContext({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    markStage,
  }) {
    const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
    const endDateInt = isoDateToCalendarInt(normalizedDateTo);
    const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
    const mark = (stageName, fields = {}) => {
      if (typeof markStage === "function") {
        markStage(stageName, fields);
      }
    };
    const loadWithStage = async (stagePrefix, loader, summarize = () => ({})) => {
      mark(`${stagePrefix}_start`);
      try {
        const value = await loader();
        mark(`${stagePrefix}_end`, summarize(value));
        return value;
      } catch (error) {
        mark(`${stagePrefix}_failed`, { details: describeLocalError(error) });
        throw error;
      }
    };

    const [calendarOverrides, pricing, restrictions] = await Promise.all([
      loadWithStage(
        "load_calendar_overrides",
        () => getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
        (rows) => ({ rowCount: Array.isArray(rows) ? rows.length : 0 })
      ),
      loadWithStage("load_pricing", () => getPropertyPricing(normalizedDomitsPropertyId), (row) => ({
        hasPricing: !!row,
      })),
      loadWithStage(
        "load_global_restrictions",
        () => getPropertyAvailabilityRestrictions(normalizedDomitsPropertyId),
        (rows) => ({ rowCount: Array.isArray(rows) ? rows.length : 0 })
      ),
    ]);
    mark("mapping_fan_out_start", {
      dateCount: dates.length,
      ratePlanMappingCount: Array.isArray(readiness?.ratePlanMappings) ? readiness.ratePlanMappings.length : 0,
      calendarOverrideCount: Array.isArray(calendarOverrides) ? calendarOverrides.length : 0,
      globalRestrictionCount: Array.isArray(restrictions) ? restrictions.length : 0,
      hasPricing: !!pricing,
    });
    const normalizedRestrictions = normalizeAvailabilityRestrictionRows(restrictions);
    const { restrictionRateItems } = buildRestrictionRateItemsFromReadiness({
      dates,
      overrideMap: buildCalendarOverrideMap(calendarOverrides),
      restrictionMapping: buildChannexRestrictionMapping(normalizedRestrictions),
      pricing,
      readiness,
      normalizedDomitsPropertyId,
      normalizedRestrictions,
      includeSnapshotBooleanRestrictions: true,
    });
    mark("mapping_fan_out_end", {
      itemCount: restrictionRateItems.length,
    });
    mark("value_summary_start", {
      itemCount: restrictionRateItems.length,
    });
    const restrictionRateGroupedPayloads = buildRestrictionRatePayloadGroups(restrictionRateItems);
    const restrictionProviderPayloads = combineChannexRestrictionSyncPayloadsForProvider(
      buildChannexRestrictionSyncPayloads(restrictionRateGroupedPayloads)
    );
    const sentChannexRestrictionFields = collectChannexRestrictionFieldsFromGroups(restrictionProviderPayloads);
    const restrictionsPayloadSummary = summarizeChannexGroupedPayloads(restrictionProviderPayloads);
    mark("value_summary_end", {
      groupCount: restrictionRateGroupedPayloads.length,
      requestCount: restrictionProviderPayloads.length,
      valueCount: restrictionProviderPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
      sentChannexRestrictionFields,
    });

    return {
      dates,
      restrictionRateItems,
      restrictionRateGroupedPayloads,
      restrictionProviderPayloads,
      sentChannexRestrictionFields,
      restrictionsPayloadSummary,
    };
  }

}
