import ChannelManagementApiService from "../channelManagementApiService.js";
import {
  CHANNEX_RESTRICTIONS_SYNC_MODE,
  CHANNEX_RESTRICTIONS_SYNC_VERSION,
} from "../utils/channexRestrictionsSyncVersion.js";

const CHANNEX_FULL_CERTIFICATION_SYNC_VERSION = "full-sync-v1";
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const safeJson = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};
const extractLastPathSegment = (path) =>
  String(path || "")
    .split("/")
    .filter(Boolean)
    .at(-1) || null;
const getHeader = (headers, name) => {
  const expected = String(name || "").toLowerCase();
  const match = Object.entries(headers || {}).find(
    ([key]) => String(key || "").toLowerCase() === expected
  );
  return match?.[1] ?? null;
};
const summarizeErrorStack = (error) =>
  (typeof error?.stack === "string" ? error.stack : "")
    .split("\n")
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean);

export default class ChannelManagementController {
  constructor({
    channelManagementApiService = new ChannelManagementApiService(),
  } = {}) {
    this.channelManagementApiService = channelManagementApiService;
  }

  async connectHolidu(event) {
    return this.channelManagementApiService.connectHolidu(safeJson(event.body) || {});
  }

  async connectChannex(event) {
    return this.channelManagementApiService.connectChannex(safeJson(event.body) || {});
  }

  async checkHoliduStatus(event) {
    return this.channelManagementApiService.checkHoliduStatus(
      event.queryStringParameters?.userId || null
    );
  }

  async checkChannexStatus(event) {
    return this.channelManagementApiService.checkChannexStatus(
      event.queryStringParameters?.userId || null
    );
  }

  async listChannexProperties(event) {
    return this.channelManagementApiService.listChannexProperties(
      event.queryStringParameters?.userId || null
    );
  }

  async listChannexRoomTypes(event) {
    return this.channelManagementApiService.listChannexRoomTypes(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.externalPropertyId || null
    );
  }

  async listChannexRatePlans(event) {
    return this.channelManagementApiService.listChannexRatePlans(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.externalRoomTypeId || null
    );
  }

  async listLinkedChannexRoomTypes(event) {
    return this.channelManagementApiService.listLinkedChannexRoomTypes(
      event.queryStringParameters?.userId || null
    );
  }

  async listLinkedChannexRatePlans(event) {
    return this.channelManagementApiService.listLinkedChannexRatePlans(
      event.queryStringParameters?.userId || null
    );
  }

  async getChannexAriTargets(event) {
    return this.channelManagementApiService.getChannexAriTargets(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null
    );
  }

  async previewChannexAri(event) {
    return this.channelManagementApiService.previewChannexAri(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null,
      event.queryStringParameters?.dateFrom || null,
      event.queryStringParameters?.dateTo || null
    );
  }

  async previewChannexAriPayloads(event) {
    return this.channelManagementApiService.previewChannexAriPayloads(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null,
      event.queryStringParameters?.dateFrom || null,
      event.queryStringParameters?.dateTo || null,
      {
        paginate: true,
        pageDateFrom: event.queryStringParameters?.pageDateFrom || null,
        pageSizeDays: event.queryStringParameters?.pageSizeDays || null,
      }
    );
  }

  async listChannexSyncEvidence(event) {
    const limitRaw = event.queryStringParameters?.limit;
    return this.channelManagementApiService.listChannexSyncEvidence(
      event.queryStringParameters?.userId || null,
      {
        integrationAccountId:
          event.queryStringParameters?.integrationAccountId || null,
        domitsPropertyId:
          event.queryStringParameters?.domitsPropertyId || null,
        syncType: event.queryStringParameters?.syncType || null,
        status: event.queryStringParameters?.status || null,
        dateFrom: event.queryStringParameters?.dateFrom || null,
        dateTo: event.queryStringParameters?.dateTo || null,
        limit: limitRaw ? Number(limitRaw) : 50,
      }
    );
  }

  async getChannexSyncEvidence(event) {
    return this.channelManagementApiService.getChannexSyncEvidence(
      event.queryStringParameters?.userId || null,
      extractLastPathSegment(event.path)
    );
  }

  async getLatestChannexSyncEvidenceSummary(event) {
    return this.channelManagementApiService.getLatestChannexSyncEvidenceSummary(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null
    );
  }

  async listChannexBookingRevisions(event) {
    const limitRaw = event.queryStringParameters?.limit;
    return this.channelManagementApiService.listChannexBookingRevisions(
      event.queryStringParameters?.userId || null,
      {
        domitsPropertyId:
          event.queryStringParameters?.domitsPropertyId || null,
        limit: limitRaw ? Number(limitRaw) : 50,
        includeRawPayload:
          String(
            event.queryStringParameters?.includeRawPayload || ""
          ).toLowerCase() === "true",
      }
    );
  }

  async receiveChannexBookingRevisions(event) {
    return this.channelManagementApiService.receiveChannexBookingRevisions(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null
    );
  }

  async pullLatestChannexBookings(event) {
    return this.channelManagementApiService.pullLatestChannexBookings(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null
    );
  }

  async cancelChannexCertificationBooking(event) {
    return this.channelManagementApiService.cancelChannexCertificationBooking(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null,
      safeJson(event.body) || {}
    );
  }

  async pollLatestChannexBookings(event) {
    return this.channelManagementApiService.pollLatestChannexBookings(
      event?.detail || event || {}
    );
  }

  async acknowledgeChannexBookingRevisions(event) {
    return this.channelManagementApiService.acknowledgeChannexBookingRevisions(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null,
      safeJson(event.body) || {}
    );
  }

  async syncChannexAvailability(event) {
    return this.channelManagementApiService.syncChannexAvailability(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null,
      event.queryStringParameters?.dateFrom || null,
      event.queryStringParameters?.dateTo || null
    );
  }

  async syncChannexBookingAvailability(event) {
    const expectedToken = requireStr(
      process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN
    );
    const providedToken = requireStr(
      getHeader(event?.headers, "x-domits-internal-token")
    );
    const allowWithoutToken = process.env.TEST === "true" && !expectedToken;

    if (
      !allowWithoutToken &&
      (!expectedToken || providedToken !== expectedToken)
    ) {
      return {
        statusCode: 403,
        response: {
          error: "FORBIDDEN",
          message: "Invalid internal booking availability sync token.",
        },
      };
    }

    return this.channelManagementApiService.syncChannexBookingAvailability(
      safeJson(event.body) || {}
    );
  }

  async syncChannexCalendarChange(event) {
    const expectedToken = requireStr(
      process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN
    );
    const providedToken = requireStr(
      getHeader(event?.headers, "x-domits-internal-token")
    );
    const allowWithoutToken = process.env.TEST === "true" && !expectedToken;

    if (
      !allowWithoutToken &&
      (!expectedToken || providedToken !== expectedToken)
    ) {
      return {
        statusCode: 403,
        response: {
          error: "FORBIDDEN",
          message: "Invalid internal calendar-change sync token.",
        },
      };
    }

    return this.channelManagementApiService.syncChannexCalendarChange(
      safeJson(event.body) || {}
    );
  }

  async syncChannexRestrictions(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId =
      event.queryStringParameters?.domitsPropertyId || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    console.info(
      JSON.stringify({
        event: "CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC",
        restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
        restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
        stage: "controller_entry",
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
      })
    );
    return this.channelManagementApiService.syncChannexRestrictions(
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo
    );
  }

  async syncChannexAri(event) {
    return this.channelManagementApiService.syncChannexAri(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null,
      event.queryStringParameters?.dateFrom || null,
      event.queryStringParameters?.dateTo || null
    );
  }

  async syncChannexFull(event) {
    try {
      const userId = event.queryStringParameters?.userId || null;
      const domitsPropertyId =
        event.queryStringParameters?.domitsPropertyId || null;
      const dateFrom = event.queryStringParameters?.dateFrom || null;
      const dateTo = event.queryStringParameters?.dateTo || null;
      const dryRun = event.queryStringParameters?.dryRun || null;
      const providerMode = event.queryStringParameters?.providerMode || null;
      const debugStage = event.queryStringParameters?.debugStage || null;
      const persistEvidence =
        event.queryStringParameters?.persistEvidence || null;
      console.info(
        JSON.stringify({
          event: "CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC",
          fullCertificationSyncVersion:
            CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "controller_reached",
          userId,
          domitsPropertyId,
          dateFrom,
          dateTo,
          dryRun,
          providerMode,
          debugStage,
          persistEvidence,
        })
      );
      return await this.channelManagementApiService.syncChannexFull(
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
        { dryRun, providerMode, debugStage, persistEvidence }
      );
    } catch (error) {
      console.error(
        "Error in Channex full certification sync controller:",
        error
      );
      return {
        statusCode: 500,
        response: {
          fullCertificationSyncVersion:
            CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "controller_catch",
          error: "Failed to run Channex certification full sync.",
          errorCode:
            "CHANNEX_CERTIFICATION_FULL_SYNC_CONTROLLER_FAILED",
          errorName: error?.name ?? null,
          errorMessage:
            error?.message ??
            "Unhandled Channex full certification sync controller error.",
          stackSummary: summarizeErrorStack(error),
        },
      };
    }
  }

  async syncChannexCertificationTestCase(event) {
    return this.channelManagementApiService.syncChannexCertificationTestCase(
      event.queryStringParameters?.userId || null,
      event.queryStringParameters?.domitsPropertyId || null,
      safeJson(event.body) || {}
    );
  }

  async saveChannexSetupMapping(event) {
    return this.channelManagementApiService.saveChannexSetupMapping(
      event.queryStringParameters?.userId || null,
      safeJson(event.body) || {}
    );
  }

  async linkChannexProperty(event) {
    return this.channelManagementApiService.linkChannexProperty(
      event.queryStringParameters?.userId || null,
      safeJson(event.body) || {}
    );
  }

  async linkChannexRoomType(event) {
    return this.channelManagementApiService.linkChannexRoomType(
      event.queryStringParameters?.userId || null,
      safeJson(event.body) || {}
    );
  }

  async linkChannexRatePlan(event) {
    return this.channelManagementApiService.linkChannexRatePlan(
      event.queryStringParameters?.userId || null,
      safeJson(event.body) || {}
    );
  }

  async disconnectHolidu(event) {
    return this.channelManagementApiService.disconnectHolidu(
      safeJson(event.body) || {}
    );
  }

  async disconnectChannex(event) {
    return this.channelManagementApiService.disconnectChannex(
      safeJson(event.body) || {}
    );
  }
}
