import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const REGION = process.env.AWS_REGION || "eu-north-1";
const DEFAULT_UNIFIED_MESSAGING_FUNCTION_NAME = "UnifiedMessaging";
export const CHANNEX_CALENDAR_CHANGE_SYNC_TYPE = "calendar-change";
export const CHANNEX_CALENDAR_CHANGE_SYNC_DISABLED = "CHANNEX_CALENDAR_CHANGE_SYNC_DISABLED";
export const CHANNEX_CALENDAR_CHANGE_SYNC_FAILED = "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED";

const lambdaClient = new LambdaClient({ region: REGION });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

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

export const createCalendarChangeFallbackEvidence = ({
    payload = null,
    skipped,
    reason,
    errors = [],
}) => ({
    syncType: CHANNEX_CALENDAR_CHANGE_SYNC_TYPE,
    source: payload?.source ?? null,
    domitsPropertyId: payload?.domitsPropertyId ?? null,
    changedDates: Array.isArray(payload?.changedDates) ? payload.changedDates : [],
    dateFrom: payload?.dateFrom ?? null,
    dateTo: payload?.dateTo ?? null,
    changeTypes: Array.isArray(payload?.changeTypes) ? payload.changeTypes : [],
    requestTypes: [],
    requestCount: 0,
    taskIds: [],
    warnings: [],
    errors,
    overallSuccess: false,
    skipped,
    reason,
});

export default class ChannexCalendarChangeSyncClient {
    constructor({ lambda = lambdaClient, functionName = process.env.UNIFIED_MESSAGING_FUNCTION_NAME } = {}) {
        this.lambda = lambda;
        this.functionName = functionName || DEFAULT_UNIFIED_MESSAGING_FUNCTION_NAME;
    }

    async syncCalendarChange(payload) {
        const internalToken = requireStr(process.env.CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN);
        if (!internalToken) {
            return createCalendarChangeFallbackEvidence({
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
                        path: "/integrations/channex/calendar-change/sync",
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
                return createCalendarChangeFallbackEvidence({
                    payload,
                    skipped: false,
                    reason: CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
                    errors: [
                        {
                            code: response?.FunctionError || lambdaBody?.statusCode || "UNIFIED_MESSAGING_ERROR",
                            message: evidence?.message || evidence?.error || "UnifiedMessaging calendar-change sync failed.",
                            httpStatus: lambdaBody?.statusCode ?? null,
                        },
                    ],
                });
            }

            return evidence;
        } catch (error) {
            return createCalendarChangeFallbackEvidence({
                payload,
                skipped: false,
                reason: CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
                errors: [
                    {
                        code: error?.code || error?.name || "LAMBDA_INVOKE_FAILED",
                        message: error?.message || "UnifiedMessaging calendar-change sync invoke failed.",
                        httpStatus: error?.statusCode ?? null,
                    },
                ],
            });
        }
    }
}
