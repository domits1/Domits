import ChannelManagementController from "../controller/channelManagementController.js";
import { isChannexCertificationUserAllowed } from "../utils/channexCertificationAccess.js";
import {
  CHANNEX_RESTRICTIONS_SYNC_MODE,
  CHANNEX_RESTRICTIONS_SYNC_VERSION,
} from "../utils/channexRestrictionsSyncVersion.js";

const CHANNEX_FULL_CERTIFICATION_SYNC_VERSION = "full-sync-v1";
const CHANNEX_BOOKING_POLL_EVENT_SOURCE = "domits.channex.booking-poll";
const CHANNEX_BOOKING_POLL_EVENT_ACTION = "CHANNEX_BOOKING_POLL";
const controller = new ChannelManagementController();
const notFound = { statusCode: 404, response: "Not Found" };
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,x-domits-internal-token",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};
const forbiddenChannexCertificationAdmin = {
  statusCode: 403,
  response: {
    error: "FORBIDDEN",
    message:
      "User is not allowed to access Channex certification admin endpoints.",
  },
};
const protectedChannexCertificationAdminRoutes = [
  { methods: ["GET"], pattern: /\/integrations\/channex\/status$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/properties$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/room-types$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/rate-plans$/ },
  {
    methods: ["GET"],
    pattern: /\/integrations\/channex\/linked-room-types$/,
  },
  {
    methods: ["GET"],
    pattern: /\/integrations\/channex\/linked-rate-plans$/,
  },
  { methods: ["GET"], pattern: /\/integrations\/channex\/ari-targets$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/ari-preview$/ },
  {
    methods: ["GET"],
    pattern: /\/integrations\/channex\/ari-payload-preview$/,
  },
  {
    methods: ["GET"],
    pattern: /\/integrations\/channex\/sync-evidence\/latest$/,
  },
  { methods: ["GET"], pattern: /\/integrations\/channex\/sync-evidence$/ },
  {
    methods: ["GET"],
    pattern: /\/integrations\/channex\/sync-evidence\/[^/]+$/,
  },
  {
    methods: ["GET"],
    pattern: /\/integrations\/channex\/bookings\/revisions$/,
  },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/sync\/availability$/,
  },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/sync\/restrictions$/,
  },
  { methods: ["POST"], pattern: /\/integrations\/channex\/sync\/ari$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/sync\/full$/ },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/certification\/test-case$/,
  },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/certification\/cancel-booking$/,
  },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/bookings\/receive$/,
  },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/bookings\/pull$/,
  },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/bookings\/ack$/,
  },
  {
    methods: ["POST"],
    pattern: /\/integrations\/channex\/setup\/mapping$/,
  },
  { methods: ["POST"], pattern: /\/integrations\/channex\/properties$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/room-types$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/rate-plans$/ },
];

const isChannelHttpPath = (path) =>
  /\/integrations\/(?:channex|holidu)(?:\/|$)/.test(String(path || ""));
const isChannexBookingPollEvent = (event) =>
  event?.source === CHANNEX_BOOKING_POLL_EVENT_SOURCE ||
  event?.action === CHANNEX_BOOKING_POLL_EVENT_ACTION ||
  event?.detail?.action === CHANNEX_BOOKING_POLL_EVENT_ACTION;
const isProtectedChannexCertificationAdminRoute = (method, path) =>
  protectedChannexCertificationAdminRoutes.some(
    (route) =>
      route.methods.includes(method) && route.pattern.test(String(path || ""))
  );
const shouldRejectChannexCertificationAdminRequest = (event) => {
  if (
    !isProtectedChannexCertificationAdminRoute(
      event?.httpMethod,
      event?.path
    )
  ) {
    return false;
  }
  const userId = event?.queryStringParameters?.userId;
  return !!userId && !isChannexCertificationUserAllowed(userId);
};
const isChannexRestrictionsSyncRequest = (method, path) =>
  method === "POST" &&
  String(path || "").endsWith("/integrations/channex/sync/restrictions");
const isChannexFullSyncRequest = (method, path) =>
  method === "POST" &&
  String(path || "").endsWith("/integrations/channex/sync/full");
const isTrueQueryParam = (value) =>
  String(value || "").trim().toLowerCase() === "true";
const summarizeErrorStack = (error) =>
  (typeof error?.stack === "string" ? error.stack : "")
    .split("\n")
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean);
const createLambdaResponse = (returnedResponse) => ({
  statusCode: returnedResponse?.statusCode || 200,
  headers: {
    ...corsHeaders,
    ...(returnedResponse?.headers || {}),
  },
  body:
    returnedResponse?.rawBody === undefined
      ? JSON.stringify(returnedResponse?.response)
      : returnedResponse.rawBody,
});
const getChannexCertificationAdminAccess = (event) => ({
  statusCode: 200,
  response: {
    allowed: isChannexCertificationUserAllowed(
      event?.queryStringParameters?.userId
    ),
  },
});

const routeDefinitions = [
  ["POST", "/integrations/holidu/connect", "connectHolidu"],
  ["POST", "/integrations/channex/connect", "connectChannex"],
  ["GET", "/integrations/holidu/status", "checkHoliduStatus"],
  ["GET", "/integrations/channex/status", "checkChannexStatus"],
  [
    "GET",
    "/integrations/channex/admin-access",
    getChannexCertificationAdminAccess,
  ],
  ["GET", "/integrations/channex/properties", "listChannexProperties"],
  ["GET", "/integrations/channex/room-types", "listChannexRoomTypes"],
  [
    "GET",
    "/integrations/channex/linked-room-types",
    "listLinkedChannexRoomTypes",
  ],
  ["GET", "/integrations/channex/rate-plans", "listChannexRatePlans"],
  [
    "GET",
    "/integrations/channex/linked-rate-plans",
    "listLinkedChannexRatePlans",
  ],
  ["GET", "/integrations/channex/ari-targets", "getChannexAriTargets"],
  ["GET", "/integrations/channex/ari-preview", "previewChannexAri"],
  [
    "GET",
    "/integrations/channex/ari-payload-preview",
    "previewChannexAriPayloads",
  ],
  [
    "GET",
    "/integrations/channex/sync-evidence/latest",
    "getLatestChannexSyncEvidenceSummary",
  ],
  [
    "GET",
    /\/integrations\/channex\/sync-evidence\/[^/]+$/,
    "getChannexSyncEvidence",
  ],
  [
    "GET",
    "/integrations/channex/sync-evidence",
    "listChannexSyncEvidence",
  ],
  [
    "GET",
    "/integrations/channex/bookings/revisions",
    "listChannexBookingRevisions",
  ],
  [
    "POST",
    "/integrations/channex/setup/mapping",
    "saveChannexSetupMapping",
  ],
  [
    "POST",
    "/integrations/channex/bookings/receive",
    "receiveChannexBookingRevisions",
  ],
  [
    "POST",
    "/integrations/channex/bookings/pull",
    "pullLatestChannexBookings",
  ],
  [
    "POST",
    "/integrations/channex/bookings/ack",
    "acknowledgeChannexBookingRevisions",
  ],
  [
    "POST",
    "/integrations/channex/booking-availability/sync",
    "syncChannexBookingAvailability",
  ],
  [
    "POST",
    "/integrations/channex/calendar-change/sync",
    "syncChannexCalendarChange",
  ],
  [
    "POST",
    "/integrations/channex/sync/availability",
    "syncChannexAvailability",
  ],
  [
    "POST",
    "/integrations/channex/sync/restrictions",
    "syncChannexRestrictions",
  ],
  ["POST", "/integrations/channex/sync/ari", "syncChannexAri"],
  ["POST", "/integrations/channex/sync/full", "syncChannexFull"],
  [
    "POST",
    "/integrations/channex/certification/test-case",
    "syncChannexCertificationTestCase",
  ],
  [
    "POST",
    "/integrations/channex/certification/cancel-booking",
    "cancelChannexCertificationBooking",
  ],
  ["POST", "/integrations/channex/rate-plans", "linkChannexRatePlan"],
  ["POST", "/integrations/channex/room-types", "linkChannexRoomType"],
  ["POST", "/integrations/channex/properties", "linkChannexProperty"],
  ["POST", "/integrations/holidu/disconnect", "disconnectHolidu"],
  ["POST", "/integrations/channex/disconnect", "disconnectChannex"],
].map(([method, path, target]) => ({
  matches: (candidateMethod, candidatePath) =>
    candidateMethod === method &&
    (path instanceof RegExp
      ? path.test(String(candidatePath || ""))
      : String(candidatePath || "").endsWith(path)),
  handle:
    typeof target === "function"
      ? target
      : (event) => controller[target](event),
}));

const findRouteHandler = (httpMethod, path) =>
  routeDefinitions.find((route) => route.matches(httpMethod, path))?.handle ||
  null;

export const handleChannelManagementEvent = async (event) => {
  if (!isChannexBookingPollEvent(event) && !isChannelHttpPath(event?.path)) {
    return null;
  }

  const { httpMethod, path } = event;
  try {
    if (isChannexBookingPollEvent(event)) {
      return createLambdaResponse(
        await controller.pollLatestChannexBookings(event)
      );
    }

    if (isChannexRestrictionsSyncRequest(httpMethod, path)) {
      console.info(
        JSON.stringify({
          event: "CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC",
          restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
          restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
          stage: "handler_entry",
          requestId: event?.requestContext?.requestId ?? null,
          awsRequestId: event?.requestContext?.requestId ?? null,
          method: httpMethod,
          path,
          queryStringParameters: {
            userId: event?.queryStringParameters?.userId ?? null,
            domitsPropertyId:
              event?.queryStringParameters?.domitsPropertyId ?? null,
            dateFrom: event?.queryStringParameters?.dateFrom ?? null,
            dateTo: event?.queryStringParameters?.dateTo ?? null,
          },
        })
      );
    }
    if (isChannexFullSyncRequest(httpMethod, path)) {
      console.info(
        JSON.stringify({
          event: "CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC",
          fullCertificationSyncVersion:
            CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "handler_entry",
          requestId: event?.requestContext?.requestId ?? null,
          awsRequestId: event?.requestContext?.requestId ?? null,
          method: httpMethod,
          path,
          queryStringParameters: {
            userId: event?.queryStringParameters?.userId ?? null,
            domitsPropertyId:
              event?.queryStringParameters?.domitsPropertyId ?? null,
            dateFrom: event?.queryStringParameters?.dateFrom ?? null,
            dateTo: event?.queryStringParameters?.dateTo ?? null,
            dryRun: event?.queryStringParameters?.dryRun ?? null,
            providerMode:
              event?.queryStringParameters?.providerMode ?? null,
            debugPing: event?.queryStringParameters?.debugPing ?? null,
            debugStage: event?.queryStringParameters?.debugStage ?? null,
          },
        })
      );
    }

    if (httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: corsHeaders, body: "" };
    }
    if (
      isChannexFullSyncRequest(httpMethod, path) &&
      isTrueQueryParam(event?.queryStringParameters?.debugPing)
    ) {
      return createLambdaResponse({
        statusCode: 200,
        response: {
          ok: true,
          route: "sync/full",
          fullCertificationSyncVersion:
            CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "debug_ping",
        },
      });
    }

    const routeHandler = findRouteHandler(httpMethod, path);
    if (!routeHandler) return createLambdaResponse(notFound);
    if (shouldRejectChannexCertificationAdminRequest(event)) {
      return createLambdaResponse(forbiddenChannexCertificationAdmin);
    }
    return createLambdaResponse(await routeHandler(event));
  } catch (error) {
    if (isChannexRestrictionsSyncRequest(httpMethod, path)) {
      console.error("Error in Channex restrictions sync handler:", error);
      console.info(
        JSON.stringify({
          event: "CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC",
          restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
          restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
          stage: "handler_catch",
          requestId: event?.requestContext?.requestId ?? null,
          awsRequestId: event?.requestContext?.requestId ?? null,
          errorName: error?.name ?? null,
          errorMessage:
            error?.message ??
            "Unhandled Channex restrictions sync error.",
        })
      );
      return createLambdaResponse({
        statusCode: 500,
        response: {
          restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
          restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
          error: "Failed to sync Channex restrictions.",
          errorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
          details: {
            name: error?.name ?? null,
            message:
              error?.message ??
              "Unhandled Channex restrictions sync error.",
          },
        },
      });
    }
    if (isChannexFullSyncRequest(httpMethod, path)) {
      console.error(
        "Error in Channex full certification sync handler:",
        error
      );
      console.info(
        JSON.stringify({
          event: "CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC",
          fullCertificationSyncVersion:
            CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "handler_catch",
          requestId: event?.requestContext?.requestId ?? null,
          awsRequestId: event?.requestContext?.requestId ?? null,
          errorName: error?.name ?? null,
          errorMessage:
            error?.message ??
            "Unhandled Channex full certification sync error.",
          stackSummary: summarizeErrorStack(error),
        })
      );
      return createLambdaResponse({
        statusCode: 500,
        response: {
          fullCertificationSyncVersion:
            CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "handler_catch",
          error: "Failed to run Channex certification full sync.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
          errorName: error?.name ?? null,
          errorMessage:
            error?.message ??
            "Unhandled Channex full certification sync error.",
          stackSummary: summarizeErrorStack(error),
          details: {
            name: error?.name ?? null,
            message:
              error?.message ??
              "Unhandled Channex full certification sync error.",
          },
        },
      });
    }
    console.error("Error in ChannelManagement handler:", error);
    return createLambdaResponse({
      statusCode: 500,
      response: "Internal Server Error",
    });
  }
};

export const channelManagementHandler = async (event) =>
  (await handleChannelManagementEvent(event)) ||
  createLambdaResponse(notFound);
