import MessageController from "./controller/messageController.js";
import IntegrationController from "./controller/integrationController.js";
import IngestionController from "./controller/ingestionController.js";
import WhatsAppWebhookController from "./controller/whatsappWebhookController.js";
import { isChannexCertificationUserAllowed } from "./business/channexCertificationAccess.js";
import {
  CHANNEX_RESTRICTIONS_SYNC_MODE,
  CHANNEX_RESTRICTIONS_SYNC_VERSION,
} from "./business/channexRestrictionsSyncVersion.js";

const CHANNEX_FULL_CERTIFICATION_SYNC_VERSION = "full-sync-v1";
const messageController = new MessageController();
const integrationController = new IntegrationController();
const ingestionController = new IngestionController();
const whatsAppWebhookController = new WhatsAppWebhookController();

const notFound = { statusCode: 404, response: "Not Found" };
const internalError = { statusCode: 500, response: "Internal Server Error" };
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-domits-internal-token",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};
const forbiddenChannexCertificationAdmin = {
  statusCode: 403,
  response: {
    error: "FORBIDDEN",
    message: "User is not allowed to access Channex certification admin endpoints.",
  },
};

const protectedChannexCertificationAdminRoutes = [
  { methods: ["GET"], pattern: /\/integrations\/channex\/status$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/ari-targets$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/ari-preview$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/ari-payload-preview$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/sync-evidence\/latest$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/sync-evidence$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/sync-evidence\/[^/]+$/ },
  { methods: ["GET"], pattern: /\/integrations\/channex\/bookings\/revisions$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/sync\/availability$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/sync\/restrictions$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/sync\/ari$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/sync\/full$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/certification\/test-case$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/bookings\/receive$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/bookings\/pull$/ },
  { methods: ["POST"], pattern: /\/integrations\/channex\/bookings\/ack$/ },
];

const pathIncludesOrEndsWith = (path, suffix) => {
  const normalizedPath = String(path || "");
  return normalizedPath.endsWith(suffix) || normalizedPath.includes(suffix);
};

const hasNestedIntegrationSubroute = (path) => {
  const normalizedPath = String(path || "");
  const integrationPrefixIndex = normalizedPath.indexOf("/integrations/");
  if (integrationPrefixIndex === -1) return false;

  const integrationNameStart = integrationPrefixIndex + "/integrations/".length;
  const nestedSlashIndex = normalizedPath.indexOf("/", integrationNameStart);

  return nestedSlashIndex > integrationNameStart && nestedSlashIndex < normalizedPath.length - 1;
};

const isProtectedChannexCertificationAdminRoute = (method, path) =>
  protectedChannexCertificationAdminRoutes.some(
    (route) => route.methods.includes(method) && route.pattern.test(String(path || ""))
  );

const shouldRejectChannexCertificationAdminRequest = (event) => {
  if (!isProtectedChannexCertificationAdminRoute(event?.httpMethod, event?.path)) return false;

  const userId = event?.queryStringParameters?.userId;
  if (!userId) return false;

  return !isChannexCertificationUserAllowed(userId);
};

const isChannexRestrictionsSyncRequest = (method, path) =>
  method === "POST" && String(path || "").endsWith("/integrations/channex/sync/restrictions");
const isChannexFullSyncRequest = (method, path) =>
  method === "POST" && String(path || "").endsWith("/integrations/channex/sync/full");
const isTrueQueryParam = (value) => String(value || "").trim().toLowerCase() === "true";
const summarizeErrorStack = (error) =>
  (typeof error?.stack === "string" ? error.stack : "")
    .split("\n")
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean);

const createLambdaResponse = (returnedResponse) => {
  const headers = {
    ...corsHeaders,
    ...(returnedResponse?.headers || {}),
  };

  let responseBody;
  if (returnedResponse?.rawBody === undefined) {
    responseBody = JSON.stringify(returnedResponse?.response);
  } else {
    responseBody = returnedResponse.rawBody;
  }

  return {
    statusCode: returnedResponse?.statusCode || 200,
    headers,
    body: responseBody,
  };
};

const routeDefinitions = [
  {
    matches: (method, path) => method === "GET" && pathIncludesOrEndsWith(path, "/webhooks/whatsapp"),
    handle: (event) => whatsAppWebhookController.verifyWebhook(event),
  },
  {
    matches: (method, path) => method === "POST" && pathIncludesOrEndsWith(path, "/webhooks/whatsapp"),
    handle: (event) => whatsAppWebhookController.handleWebhookEvent(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/connect/start"),
    handle: (event) => integrationController.startWhatsAppConnect(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/holidu/connect"),
    handle: (event) => integrationController.connectHolidu(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/connect"),
    handle: (event) => integrationController.connectChannex(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/holidu/status"),
    handle: (event) => integrationController.checkHoliduStatus(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/status"),
    handle: (event) => integrationController.checkChannexStatus(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/properties"),
    handle: (event) => integrationController.listChannexProperties(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/room-types"),
    handle: (event) => integrationController.listChannexRoomTypes(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/linked-room-types"),
    handle: (event) => integrationController.listLinkedChannexRoomTypes(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/rate-plans"),
    handle: (event) => integrationController.listChannexRatePlans(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/linked-rate-plans"),
    handle: (event) => integrationController.listLinkedChannexRatePlans(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/ari-targets"),
    handle: (event) => integrationController.getChannexAriTargets(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/ari-preview"),
    handle: (event) => integrationController.previewChannexAri(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/ari-payload-preview"),
    handle: (event) => integrationController.previewChannexAriPayloads(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/sync-evidence/latest"),
    handle: (event) => integrationController.getLatestChannexSyncEvidenceSummary(event),
  },
  {
    matches: (method, path) => method === "GET" && /\/integrations\/channex\/sync-evidence\/[^/]+$/.test(String(path || "")),
    handle: (event) => integrationController.getChannexSyncEvidence(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/sync-evidence"),
    handle: (event) => integrationController.listChannexSyncEvidence(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/bookings/revisions"),
    handle: (event) => integrationController.listChannexBookingRevisions(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/bookings/receive"),
    handle: (event) => integrationController.receiveChannexBookingRevisions(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/bookings/pull"),
    handle: (event) => integrationController.pullLatestChannexBookings(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/bookings/ack"),
    handle: (event) => integrationController.acknowledgeChannexBookingRevisions(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").endsWith("/integrations/channex/booking-availability/sync"),
    handle: (event) => integrationController.syncChannexBookingAvailability(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/sync/availability"),
    handle: (event) => integrationController.syncChannexAvailability(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/sync/restrictions"),
    handle: (event) => integrationController.syncChannexRestrictions(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/sync/ari"),
    handle: (event) => integrationController.syncChannexAri(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/sync/full"),
    handle: (event) => integrationController.syncChannexFull(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").endsWith("/integrations/channex/certification/test-case"),
    handle: (event) => integrationController.syncChannexCertificationTestCase(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/rate-plans"),
    handle: (event) => integrationController.linkChannexRatePlan(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/room-types"),
    handle: (event) => integrationController.linkChannexRoomType(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/properties"),
    handle: (event) => integrationController.linkChannexProperty(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/holidu/disconnect"),
    handle: (event) => integrationController.disconnectHolidu(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/disconnect"),
    handle: (event) => integrationController.disconnectChannex(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/connect/complete"),
    handle: (event) => integrationController.completeWhatsAppConnect(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").endsWith("/integrations/whatsapp/connect/select-number"),
    handle: (event) => integrationController.selectWhatsAppNumber(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/disconnect"),
    handle: (event) => integrationController.disconnectWhatsApp(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/token/health"),
    handle: (event) => integrationController.checkWhatsAppTokenHealth(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/token/refresh"),
    handle: (event) => integrationController.refreshWhatsAppToken(event),
  },
  {
    matches: (method, path) => method === "POST" && pathIncludesOrEndsWith(path, "/send"),
    handle: (event) => messageController.sendMessage(event),
  },
  {
    matches: (method, path) => method === "GET" && pathIncludesOrEndsWith(path, "/threads"),
    handle: (event) => messageController.getThreads(event),
  },
  {
    matches: (method, path) => method === "GET" && pathIncludesOrEndsWith(path, "/messages"),
    handle: (event) => messageController.getMessages(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/ingest/messages"),
    handle: (event) => ingestionController.ingestMessages(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && pathIncludesOrEndsWith(path, "/integrations") && !hasNestedIntegrationSubroute(path),
    handle: (event) => integrationController.createIntegration(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && pathIncludesOrEndsWith(path, "/integrations") && !hasNestedIntegrationSubroute(path),
    handle: (event) => integrationController.listIntegrations(event),
  },
  {
    matches: (method, path) => method === "PATCH" && String(path || "").includes("/integrations/"),
    handle: (event) => integrationController.updateIntegration(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/logs"),
    handle: (event) => integrationController.getIntegrationLogs(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/properties"),
    handle: (event) => integrationController.upsertIntegrationProperty(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/properties"),
    handle: (event) => integrationController.listIntegrationProperties(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/sync/messages"),
    handle: (event) => integrationController.triggerMessagesSync(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/sync/reservations"),
    handle: (event) => integrationController.triggerReservationsSync(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/reservations/link"),
    handle: (event) => integrationController.linkReservation(event),
  },
];

const findRouteHandler = (httpMethod, path) =>
  routeDefinitions.find((route) => route.matches(httpMethod, path))?.handle || null;

export const handler = async (event) => {
  const { httpMethod, path } = event;

  try {
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
            domitsPropertyId: event?.queryStringParameters?.domitsPropertyId ?? null,
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
          fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "handler_entry",
          requestId: event?.requestContext?.requestId ?? null,
          awsRequestId: event?.requestContext?.requestId ?? null,
          method: httpMethod,
          path,
          queryStringParameters: {
            userId: event?.queryStringParameters?.userId ?? null,
            domitsPropertyId: event?.queryStringParameters?.domitsPropertyId ?? null,
            dateFrom: event?.queryStringParameters?.dateFrom ?? null,
            dateTo: event?.queryStringParameters?.dateTo ?? null,
            dryRun: event?.queryStringParameters?.dryRun ?? null,
            providerMode: event?.queryStringParameters?.providerMode ?? null,
            debugPing: event?.queryStringParameters?.debugPing ?? null,
            debugStage: event?.queryStringParameters?.debugStage ?? null,
          },
        })
      );
    }

    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: "",
      };
    }

    if (isChannexFullSyncRequest(httpMethod, path) && isTrueQueryParam(event?.queryStringParameters?.debugPing)) {
      return createLambdaResponse({
        statusCode: 200,
        response: {
          ok: true,
          route: "sync/full",
          fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "debug_ping",
        },
      });
    }

    const routeHandler = findRouteHandler(httpMethod, path);

    if (!routeHandler) {
      return createLambdaResponse(notFound);
    }

    if (shouldRejectChannexCertificationAdminRequest(event)) {
      return createLambdaResponse(forbiddenChannexCertificationAdmin);
    }

    const returnedResponse = await routeHandler(event);
    return createLambdaResponse(returnedResponse);
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
          errorMessage: error?.message ?? "Unhandled Channex restrictions sync error.",
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
            message: error?.message ?? "Unhandled Channex restrictions sync error.",
          },
        },
      });
    }
    if (isChannexFullSyncRequest(httpMethod, path)) {
      console.error("Error in Channex full certification sync handler:", error);
      console.info(
        JSON.stringify({
          event: "CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC",
          fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "handler_catch",
          requestId: event?.requestContext?.requestId ?? null,
          awsRequestId: event?.requestContext?.requestId ?? null,
          errorName: error?.name ?? null,
          errorMessage: error?.message ?? "Unhandled Channex full certification sync error.",
          stackSummary: summarizeErrorStack(error),
        })
      );
      return createLambdaResponse({
        statusCode: 500,
        response: {
          fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "handler_catch",
          error: "Failed to run Channex certification full sync.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
          errorName: error?.name ?? null,
          errorMessage: error?.message ?? "Unhandled Channex full certification sync error.",
          stackSummary: summarizeErrorStack(error),
          details: {
            name: error?.name ?? null,
            message: error?.message ?? "Unhandled Channex full certification sync error.",
          },
        },
      });
    }
    console.error("Error in handler:", error);
    return createLambdaResponse(internalError);
  }
};
