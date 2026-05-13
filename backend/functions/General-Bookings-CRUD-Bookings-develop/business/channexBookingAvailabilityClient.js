import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const REGION = process.env.AWS_REGION || "eu-north-1";
const DEFAULT_UNIFIED_MESSAGING_FUNCTION_NAME = "UnifiedMessaging";
export const CHANNEX_BOOKING_AVAILABILITY_SYNC_TYPE = "booking-availability";
export const CHANNEX_BOOKING_AVAILABILITY_SYNC_DISABLED = "CHANNEX_BOOKING_AVAILABILITY_SYNC_DISABLED";
export const CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED = "CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED";

const lambdaClient = new LambdaClient({ region: REGION });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const getBookingId = (booking) =>
  requireStr(booking?.id) || requireStr(booking?.bookingId) || requireStr(booking?.booking_id);

const getPropertyId = (booking) =>
  requireStr(booking?.property_id) || requireStr(booking?.propertyId) || requireStr(booking?.domitsPropertyId);

export const createBookingAvailabilityFallbackEvidence = ({
  payload = null,
  booking = null,
  trigger = null,
  skipped,
  reason,
  errors = [],
}) => {
  const referenceBooking = booking || payload?.bookingAfter || payload?.bookingBefore || {};
  return {
    bookingId: getBookingId(referenceBooking) ?? null,
    trigger: trigger ?? payload?.trigger ?? null,
    syncType: CHANNEX_BOOKING_AVAILABILITY_SYNC_TYPE,
    domitsPropertyId: getPropertyId(referenceBooking) ?? null,
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
    errors,
    overallSuccess: false,
    skipped,
    reason,
  };
};

const parseJsonSafely = (value) => {
  try {
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const decodePayload = (payload) => {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return new TextDecoder("utf-8").decode(payload);
};

export default class ChannexBookingAvailabilityClient {
  constructor({ lambda = lambdaClient, functionName = process.env.UNIFIED_MESSAGING_FUNCTION_NAME } = {}) {
    this.lambda = lambda;
    this.functionName = functionName || DEFAULT_UNIFIED_MESSAGING_FUNCTION_NAME;
  }

  async syncAvailabilityForBookingChange(payload) {
    const internalToken = requireStr(process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN);
    if (!internalToken) {
      return createBookingAvailabilityFallbackEvidence({
        payload,
        skipped: true,
        reason: "CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN_MISSING",
      });
    }

    try {
      const response = await this.lambda.send(
        new InvokeCommand({
          FunctionName: this.functionName,
          Payload: JSON.stringify({
            httpMethod: "POST",
            path: "/integrations/channex/booking-availability/sync",
            headers: {
              "x-domits-internal-token": internalToken,
            },
            queryStringParameters: {},
            body: JSON.stringify(payload),
          }),
        })
      );

      const lambdaBody = parseJsonSafely(decodePayload(response?.Payload)) || {};
      const evidence = parseJsonSafely(lambdaBody?.body) || lambdaBody?.response || null;
      if (response?.FunctionError || Number(lambdaBody?.statusCode) >= 400 || !evidence) {
        return createBookingAvailabilityFallbackEvidence({
          payload,
          skipped: false,
          reason: CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
          errors: [
            {
              code: response?.FunctionError || lambdaBody?.statusCode || "UNIFIED_MESSAGING_ERROR",
              message: evidence?.message || evidence?.error || "UnifiedMessaging booking availability sync failed.",
              httpStatus: lambdaBody?.statusCode ?? null,
            },
          ],
        });
      }

      return evidence;
    } catch (error) {
      return createBookingAvailabilityFallbackEvidence({
        payload,
        skipped: false,
        reason: CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
        errors: [
          {
            code: error?.code || error?.name || "LAMBDA_INVOKE_FAILED",
            message: error?.message || "UnifiedMessaging booking availability sync invoke failed.",
            httpStatus: error?.statusCode ?? null,
          },
        ],
      });
    }
  }
}
