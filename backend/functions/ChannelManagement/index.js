import { handler as unifiedMessagingHandler } from "../UnifiedMessaging/index.js";

const CHANNEX_BOOKING_POLL_EVENT_SOURCE = "domits.channex.booking-poll";
const CHANNEX_BOOKING_POLL_EVENT_ACTION = "CHANNEX_BOOKING_POLL";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-domits-internal-token",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};

const isChannelManagementEvent = (event) =>
  event?.source === CHANNEX_BOOKING_POLL_EVENT_SOURCE ||
  event?.action === CHANNEX_BOOKING_POLL_EVENT_ACTION ||
  event?.detail?.action === CHANNEX_BOOKING_POLL_EVENT_ACTION ||
  /\/integrations\/(?:channex|holidu)(?:\/|$)/.test(String(event?.path || ""));

export const handler = (event) => {
  if (isChannelManagementEvent(event)) {
    return unifiedMessagingHandler(event);
  }

  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify("Not Found"),
  };
};
