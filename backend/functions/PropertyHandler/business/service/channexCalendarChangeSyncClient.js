import { LambdaClient } from "@aws-sdk/client-lambda";
import { invokeLambdaHttpEvent } from "../../.shared/lambdaHttpInvocation.js";

const REGION = process.env.AWS_REGION || "eu-north-1";
const DEFAULT_UNIFIED_MESSAGING_FUNCTION_NAME = "UnifiedMessaging";
export const CHANNEX_CALENDAR_CHANGE_SYNC_TYPE = "calendar-change";
export const CHANNEX_CALENDAR_CHANGE_SYNC_DISABLED = "CHANNEX_CALENDAR_CHANGE_SYNC_DISABLED";
export const CHANNEX_CALENDAR_CHANGE_SYNC_FAILED = "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED";

const lambdaClient = new LambdaClient({ region: REGION });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const buildFallbackError = ({ code, message, httpStatus }) => ({
    code,
    message,
    httpStatus,
});

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

const buildCalendarChangeSyncPayload = (payload, internalToken) => ({
    httpMethod: "POST",
    path: "/integrations/channex/calendar-change/sync",
    headers: {
        "x-domits-internal-token": internalToken,
    },
    queryStringParameters: {},
    body: JSON.stringify(payload),
});

const createCalendarChangeFailureEvidence = ({ payload, error }) =>
    createCalendarChangeFallbackEvidence({
        payload,
        skipped: false,
        reason: CHANNEX_CALENDAR_CHANGE_SYNC_FAILED,
        errors: [buildFallbackError(error)],
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
            const { response, lambdaBody, responseBody: evidence } = await invokeLambdaHttpEvent({
                lambda: this.lambda,
                functionName: this.functionName,
                event: buildCalendarChangeSyncPayload(payload, internalToken),
            });
            if (response?.FunctionError || Number(lambdaBody?.statusCode) >= 400 || !evidence) {
                return createCalendarChangeFailureEvidence({
                    payload,
                    error: {
                        code: response?.FunctionError || lambdaBody?.statusCode || "UNIFIED_MESSAGING_ERROR",
                        message: evidence?.message || evidence?.error || "UnifiedMessaging calendar-change sync failed.",
                        httpStatus: lambdaBody?.statusCode ?? null,
                    },
                });
            }

            return evidence;
        } catch (error) {
            return createCalendarChangeFailureEvidence({
                payload,
                error: {
                    code: error?.code || error?.name || "LAMBDA_INVOKE_FAILED",
                    message: error?.message || "UnifiedMessaging calendar-change sync invoke failed.",
                    httpStatus: error?.statusCode ?? null,
                },
            });
        }
    }
}
