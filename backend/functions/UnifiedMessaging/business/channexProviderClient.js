const CHANNEX_BASE_URL = process.env.CHANNEX_BASE_URL || "https://staging.channex.io";

const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const normalizeNonNegativeInteger = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : null;
};
const normalizeWarnings = (parsed) => (Array.isArray(parsed?.meta?.warnings) ? parsed.meta.warnings : []);
const normalizeTaskIds = (parsed) =>
  Array.isArray(parsed?.data) ? parsed.data.map((item) => requireStr(item?.id)).filter(Boolean) : [];
const normalizeChannexBookingRevision = (row) => {
  const revisionId = requireStr(row?.id);
  const attributes = row?.attributes && typeof row.attributes === "object" ? row.attributes : {};
  const customer = attributes?.customer && typeof attributes.customer === "object" ? attributes.customer : {};
  const rooms = Array.isArray(attributes?.rooms) ? attributes.rooms : [];
  const firstRoom = rooms.at(0) ?? null;

  return {
    revisionId,
    bookingId: requireStr(attributes?.booking_id),
    propertyId: requireStr(attributes?.property_id),
    uniqueId: requireStr(attributes?.unique_id),
    systemId: requireStr(attributes?.system_id),
    otaReservationCode: requireStr(attributes?.ota_reservation_code),
    otaName: requireStr(attributes?.ota_name),
    status: requireStr(attributes?.status),
    arrivalDate: requireStr(attributes?.arrival_date),
    departureDate: requireStr(attributes?.departure_date),
    arrivalHour: requireStr(attributes?.arrival_hour),
    amount: attributes?.amount ?? null,
    currency: requireStr(attributes?.currency),
    insertedAt: requireStr(attributes?.inserted_at),
    guestName:
      requireStr(customer?.name) ||
      [requireStr(customer?.first_name), requireStr(customer?.last_name)].filter(Boolean).join(" ") ||
      null,
    rooms: rooms.map((room) => ({
      roomTypeId: requireStr(room?.room_type_id),
      ratePlanId: requireStr(room?.rate_plan_id),
    })),
    ratePlanId: requireStr(firstRoom?.rate_plan_id),
    roomTypeId: requireStr(firstRoom?.room_type_id),
    rawPayload: row,
  };
};

const parseJsonSafely = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getProviderStatusForHttpStatus = (httpStatus, fallbackStatus) => {
  if (httpStatus === 401) {
    return "UNAUTHORIZED";
  }
  return fallbackStatus;
};

const getPushGroupIdentity = (group, includeRatePlanId = false) => {
  const identity = {
    externalPropertyId: requireStr(group?.externalPropertyId),
    externalRoomTypeId: requireStr(group?.externalRoomTypeId),
  };
  if (Array.isArray(group?.externalPropertyIds)) {
    identity.externalPropertyIds = group.externalPropertyIds.map(requireStr).filter(Boolean);
  }
  if (Array.isArray(group?.externalRoomTypeIds)) {
    identity.externalRoomTypeIds = group.externalRoomTypeIds.map(requireStr).filter(Boolean);
  }
  if (includeRatePlanId) {
    identity.externalRatePlanId = requireStr(group?.externalRatePlanId);
    if (Array.isArray(group?.externalRatePlanIds)) {
      identity.externalRatePlanIds = group.externalRatePlanIds.map(requireStr).filter(Boolean);
    }
  }
  return identity;
};

const buildRequestBody = (group) => ({
  values: Array.isArray(group?.values) ? group.values : [],
});

const getFailedPushProviderStatus = (httpStatus, fallbackStatus) => {
  if (httpStatus === 401) {
    return "UNAUTHORIZED";
  }
  if (httpStatus === 429) {
    return "RATE_LIMITED";
  }
  return fallbackStatus;
};

const buildInvalidCredentialsPushResult = (group, includeRatePlanId) => ({
  ...getPushGroupIdentity(group, includeRatePlanId),
  requestBody: buildRequestBody(group),
  httpStatus: null,
  providerStatus: "INVALID_CREDENTIALS",
  success: false,
  taskId: null,
  warnings: [],
  errorCode: "MISSING_API_KEY",
  errorMessage: "Channex credentials must include apiKey.",
});

const buildMissingValuesPushResult = ({ group, requestBody, includeRatePlanId, errorCode, errorMessage }) => ({
  ...getPushGroupIdentity(group, includeRatePlanId),
  requestBody,
  httpStatus: null,
  providerStatus: "INVALID_REQUEST",
  success: false,
  taskId: null,
  warnings: [],
  errorCode,
  errorMessage,
});

const buildProviderPushFailureResult = ({
  group,
  requestBody,
  response,
  parsed,
  warnings,
  taskIds,
  includeRatePlanId,
  fallbackStatus,
  errorCodePrefix,
  errorMessagePrefix,
}) => ({
  ...getPushGroupIdentity(group, includeRatePlanId),
  requestBody,
  httpStatus: response.status,
  providerStatus: getFailedPushProviderStatus(response.status, fallbackStatus),
  success: false,
  taskId: taskIds[0] ?? null,
  warnings,
  errorCode:
    parsed?.errors?.code ||
    parsed?.error?.code ||
    `${errorCodePrefix}_${response.status}`,
  errorMessage:
    parsed?.errors?.title ||
    parsed?.error?.message ||
    `${errorMessagePrefix} failed with status ${response.status}.`,
});

const buildProviderPushSuccessResult = ({ group, requestBody, response, warnings, taskIds, includeRatePlanId }) => ({
  ...getPushGroupIdentity(group, includeRatePlanId),
  requestBody,
  httpStatus: response.status,
  providerStatus: warnings.length ? "ACCEPTED_WITH_WARNINGS" : "SYNCED",
  success: warnings.length === 0,
  taskId: taskIds[0] ?? null,
  warnings,
  errorCode: null,
  errorMessage: warnings.length ? "Channex accepted the request with warnings." : null,
});

const buildProviderPushExceptionResult = ({
  group,
  requestBody,
  error,
  includeRatePlanId,
  fallbackStatus,
  requestFailedCode,
  requestFailedMessage,
}) => ({
  ...getPushGroupIdentity(group, includeRatePlanId),
  requestBody,
  httpStatus: null,
  providerStatus: fallbackStatus,
  success: false,
  taskId: null,
  warnings: [],
  errorCode: error?.code || error?.name || requestFailedCode,
  errorMessage: error?.message || requestFailedMessage,
});

const withPushRequestContext = (result, endpointPath) => ({
  ...result,
  endpoint: endpointPath,
  method: "POST",
});

const postChannexPushRequest = async ({ apiKey, endpointPath, requestBody, requestTimeoutMs = null }) => {
  const url = new URL(endpointPath, CHANNEX_BASE_URL);
  const controller =
    Number.isFinite(Number(requestTimeoutMs)) && Number(requestTimeoutMs) > 0
      ? new AbortController()
      : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), Math.trunc(Number(requestTimeoutMs)))
    : null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      ...(controller ? { signal: controller.signal } : {}),
    });
    const rawText = await response.text();
    const parsed = parseJsonSafely(rawText);
    return {
      response,
      parsed,
      warnings: normalizeWarnings(parsed),
      taskIds: normalizeTaskIds(parsed),
    };
  } catch (error) {
    if (controller?.signal?.aborted) {
      const timeoutError = new Error(
        `Channex push request timed out after ${Math.trunc(Number(requestTimeoutMs))} ms.`
      );
      timeoutError.code = "CHANNEX_PUSH_REQUEST_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const pushGroupedPayloads = async ({
  apiKey,
  groups,
  endpointPath,
  includeRatePlanId = false,
  missingValuesCode,
  missingValuesMessage,
  fallbackStatus,
  errorCodePrefix,
  errorMessagePrefix,
  requestFailedCode,
  requestFailedMessage,
  requestTimeoutMs = null,
  stopOnFailure = false,
}) => {
  if (!apiKey) {
    return {
      success: false,
      results: groups.map((group) =>
        withPushRequestContext(buildInvalidCredentialsPushResult(group, includeRatePlanId), endpointPath)
      ),
    };
  }

  const results = [];
  for (const group of groups) {
    const requestBody = buildRequestBody(group);
    if (requestBody.values.length === 0) {
      results.push(
        withPushRequestContext(
          buildMissingValuesPushResult({
            group,
            requestBody,
            includeRatePlanId,
            errorCode: missingValuesCode,
            errorMessage: missingValuesMessage,
          }),
          endpointPath
        )
      );
      continue;
    }

    try {
      const providerResponse = await postChannexPushRequest({ apiKey, endpointPath, requestBody, requestTimeoutMs });
      if (providerResponse.response.ok) {
        results.push(
          withPushRequestContext(
            buildProviderPushSuccessResult({
              group,
              requestBody,
              response: providerResponse.response,
              warnings: providerResponse.warnings,
              taskIds: providerResponse.taskIds,
              includeRatePlanId,
            }),
            endpointPath
          )
        );
        continue;
      }

      results.push(
        withPushRequestContext(
          buildProviderPushFailureResult({
            group,
            requestBody,
            response: providerResponse.response,
            parsed: providerResponse.parsed,
            warnings: providerResponse.warnings,
            taskIds: providerResponse.taskIds,
            includeRatePlanId,
            fallbackStatus,
            errorCodePrefix,
            errorMessagePrefix,
          }),
          endpointPath
        )
      );
      if (stopOnFailure) break;
    } catch (error) {
      results.push(
        withPushRequestContext(
          buildProviderPushExceptionResult({
            group,
            requestBody,
            error,
            includeRatePlanId,
            fallbackStatus,
            requestFailedCode,
            requestFailedMessage,
          }),
          endpointPath
        )
      );
      if (stopOnFailure) break;
    }
  }

  return {
    success: results.every((result) => result.success),
    results,
  };
};

export default class ChannexProviderClient {
  async validateApiKey(credentials) {
    const apiKey = requireStr(credentials?.apiKey);

    if (!apiKey) {
      return {
        success: false,
        canValidate: true,
        externalAccountId: null,
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        errorMessage: "Channex credentials must include apiKey.",
      };
    }

    try {
      const url = new URL("/api/v1/properties", CHANNEX_BASE_URL);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-api-key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafely(rawText);

      if (!response.ok) {
        return {
          success: false,
          canValidate: true,
          externalAccountId: null,
          providerStatus: getProviderStatusForHttpStatus(response.status, "VALIDATION_FAILED"),
          errorCode:
            parsed?.errors?.code ||
            parsed?.error?.code ||
            `CHANNEX_VALIDATE_${response.status}`,
          errorMessage:
            parsed?.errors?.title ||
            parsed?.error?.message ||
            `Channex validation failed with status ${response.status}.`,
        };
      }

      const firstPropertyId = requireStr(parsed?.data?.[0]?.id);

      return {
        success: true,
        canValidate: true,
        externalAccountId: firstPropertyId,
        providerStatus: "ACTIVE",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        canValidate: true,
        externalAccountId: null,
        providerStatus: "VALIDATION_FAILED",
        errorCode: error?.code || error?.name || "CHANNEX_VALIDATION_REQUEST_FAILED",
        errorMessage: error?.message || "Channex validation request failed.",
      };
    }
  }

  async listProperties(credentials) {
    const apiKey = requireStr(credentials?.apiKey);

    if (!apiKey) {
      return {
        success: false,
        properties: [],
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        errorMessage: "Channex credentials must include apiKey.",
      };
    }

    try {
      const url = new URL("/api/v1/properties", CHANNEX_BASE_URL);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-api-key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafely(rawText);

      if (!response.ok) {
        return {
          success: false,
          properties: [],
          providerStatus: getProviderStatusForHttpStatus(response.status, "PROPERTY_LIST_FAILED"),
          errorCode:
            parsed?.errors?.code ||
            parsed?.error?.code ||
            `CHANNEX_PROPERTIES_${response.status}`,
          errorMessage:
            parsed?.errors?.title ||
            parsed?.error?.message ||
            `Channex property list failed with status ${response.status}.`,
        };
      }

      const rows = Array.isArray(parsed?.data) ? parsed.data : null;
      if (!rows) {
        return {
          success: false,
          properties: [],
          providerStatus: "INVALID_RESPONSE",
          errorCode: "CHANNEX_PROPERTIES_INVALID_RESPONSE",
          errorMessage: "Channex property list response was missing a usable data array.",
        };
      }

      const properties = rows
        .map((row) => {
          const externalPropertyId = requireStr(row?.id);
          if (!externalPropertyId) return null;

          return {
            externalPropertyId,
            externalPropertyName:
              requireStr(row?.attributes?.title) ||
              requireStr(row?.attributes?.name) ||
              null,
            propertyStatus: requireStr(row?.attributes?.state) || null,
          };
        })
        .filter(Boolean);

      return {
        success: true,
        properties,
        providerStatus: "ACTIVE",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        properties: [],
        providerStatus: "PROPERTY_LIST_FAILED",
        errorCode: error?.code || error?.name || "CHANNEX_PROPERTY_LIST_REQUEST_FAILED",
        errorMessage: error?.message || "Channex property list request failed.",
      };
    }
  }

  async listRoomTypes(credentials, externalPropertyId) {
    const apiKey = requireStr(credentials?.apiKey);
    const propertyId = requireStr(externalPropertyId);

    if (!apiKey) {
      return {
        success: false,
        roomTypes: [],
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        errorMessage: "Channex credentials must include apiKey.",
      };
    }

    if (!propertyId) {
      return {
        success: false,
        roomTypes: [],
        providerStatus: "INVALID_REQUEST",
        errorCode: "MISSING_PROPERTY_ID",
        errorMessage: "Channex room type discovery requires externalPropertyId.",
      };
    }

    try {
      const url = new URL("/api/v1/room_types", CHANNEX_BASE_URL);
      url.searchParams.set("filter[property_id]", propertyId);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-api-key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafely(rawText);

      if (!response.ok) {
        return {
          success: false,
          roomTypes: [],
          providerStatus: getProviderStatusForHttpStatus(response.status, "ROOM_TYPE_LIST_FAILED"),
          errorCode:
            parsed?.errors?.code ||
            parsed?.error?.code ||
            `CHANNEX_ROOM_TYPES_${response.status}`,
          errorMessage:
            parsed?.errors?.title ||
            parsed?.error?.message ||
            `Channex room type list failed with status ${response.status}.`,
        };
      }

      const rows = Array.isArray(parsed?.data) ? parsed.data : null;
      if (!rows) {
        return {
          success: false,
          roomTypes: [],
          providerStatus: "INVALID_RESPONSE",
          errorCode: "CHANNEX_ROOM_TYPES_INVALID_RESPONSE",
          errorMessage: "Channex room type list response was missing a usable data array.",
        };
      }

      const roomTypes = rows
        .map((row) => {
          const externalRoomTypeId = requireStr(row?.id);
          if (!externalRoomTypeId) return null;
          const attributes = row?.attributes || {};

          return {
            externalRoomTypeId,
            externalRoomTypeName:
              requireStr(attributes?.title) ||
              requireStr(attributes?.name) ||
              null,
            roomTypeStatus: requireStr(attributes?.state) || null,
            countOfRooms: normalizeNonNegativeInteger(
              attributes?.count_of_rooms ??
              attributes?.countOfRooms ??
              attributes?.count
            ),
          };
        })
        .filter(Boolean);

      return {
        success: true,
        roomTypes,
        providerStatus: "ACTIVE",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        roomTypes: [],
        providerStatus: "ROOM_TYPE_LIST_FAILED",
        errorCode: error?.code || error?.name || "CHANNEX_ROOM_TYPE_LIST_REQUEST_FAILED",
        errorMessage: error?.message || "Channex room type list request failed.",
      };
    }
  }

  async listRatePlans(credentials, externalRoomTypeId) {
    const apiKey = requireStr(credentials?.apiKey);
    const roomTypeId = requireStr(externalRoomTypeId);

    if (!apiKey) {
      return {
        success: false,
        ratePlans: [],
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        errorMessage: "Channex credentials must include apiKey.",
      };
    }

    if (!roomTypeId) {
      return {
        success: false,
        ratePlans: [],
        providerStatus: "INVALID_REQUEST",
        errorCode: "MISSING_ROOM_TYPE_ID",
        errorMessage: "Channex rate plan discovery requires externalRoomTypeId.",
      };
    }

    try {
      const url = new URL("/api/v1/rate_plans", CHANNEX_BASE_URL);
      url.searchParams.set("filter[room_type_id]", roomTypeId);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-api-key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafely(rawText);

      if (!response.ok) {
        return {
          success: false,
          ratePlans: [],
          providerStatus: getProviderStatusForHttpStatus(response.status, "RATE_PLAN_LIST_FAILED"),
          errorCode:
            parsed?.errors?.code ||
            parsed?.error?.code ||
            `CHANNEX_RATE_PLANS_${response.status}`,
          errorMessage:
            parsed?.errors?.title ||
            parsed?.error?.message ||
            `Channex rate plan list failed with status ${response.status}.`,
        };
      }

      const rows = Array.isArray(parsed?.data) ? parsed.data : null;
      if (!rows) {
        return {
          success: false,
          ratePlans: [],
          providerStatus: "INVALID_RESPONSE",
          errorCode: "CHANNEX_RATE_PLANS_INVALID_RESPONSE",
          errorMessage: "Channex rate plan list response was missing a usable data array.",
        };
      }

      const ratePlans = rows
        .map((row) => {
          const externalRatePlanId = requireStr(row?.id);
          if (!externalRatePlanId) return null;

          return {
            externalRatePlanId,
            externalRatePlanName:
              requireStr(row?.attributes?.title) ||
              requireStr(row?.attributes?.name) ||
              null,
            ratePlanStatus: requireStr(row?.attributes?.state) || null,
          };
        })
        .filter(Boolean);

      return {
        success: true,
        ratePlans,
        providerStatus: "ACTIVE",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        ratePlans: [],
        providerStatus: "RATE_PLAN_LIST_FAILED",
        errorCode: error?.code || error?.name || "CHANNEX_RATE_PLAN_LIST_REQUEST_FAILED",
        errorMessage: error?.message || "Channex rate plan list request failed.",
      };
    }
  }

  async pushAvailability(credentials, groupedAvailabilityPayloads, options = {}) {
    const apiKey = requireStr(credentials?.apiKey);
    const groups = Array.isArray(groupedAvailabilityPayloads) ? groupedAvailabilityPayloads : [];

    return await pushGroupedPayloads({
      apiKey,
      groups,
      endpointPath: "/api/v1/availability",
      missingValuesCode: "CHANNEX_AVAILABILITY_VALUES_MISSING",
      missingValuesMessage: "Channex availability push requires at least one values entry.",
      fallbackStatus: "AVAILABILITY_PUSH_FAILED",
      errorCodePrefix: "CHANNEX_AVAILABILITY_PUSH",
      errorMessagePrefix: "Channex availability push",
      requestFailedCode: "CHANNEX_AVAILABILITY_PUSH_REQUEST_FAILED",
      requestFailedMessage: "Channex availability push request failed.",
      requestTimeoutMs: options?.requestTimeoutMs,
      stopOnFailure: !!options?.stopOnFailure,
    });
  }

  async pushRestrictions(credentials, groupedRestrictionRatePayloads, options = {}) {
    const apiKey = requireStr(credentials?.apiKey);
    const groups = Array.isArray(groupedRestrictionRatePayloads) ? groupedRestrictionRatePayloads : [];

    return await pushGroupedPayloads({
      apiKey,
      groups,
      endpointPath: "/api/v1/restrictions",
      includeRatePlanId: true,
      requestTimeoutMs: options?.requestTimeoutMs,
      stopOnFailure: !!options?.stopOnFailure,
      missingValuesCode: "CHANNEX_RESTRICTIONS_VALUES_MISSING",
      missingValuesMessage: "Channex restrictions push requires at least one values entry.",
      fallbackStatus: "RESTRICTIONS_PUSH_FAILED",
      errorCodePrefix: "CHANNEX_RESTRICTIONS_PUSH",
      errorMessagePrefix: "Channex restrictions push",
      requestFailedCode: "CHANNEX_RESTRICTIONS_PUSH_REQUEST_FAILED",
      requestFailedMessage: "Channex restrictions push request failed.",
    });
  }

  async listBookingRevisionFeed(credentials, { externalPropertyId } = {}) {
    const apiKey = requireStr(credentials?.apiKey);
    const propertyId = requireStr(externalPropertyId);

    if (!apiKey) {
      return {
        success: false,
        revisions: [],
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        errorMessage: "Channex credentials must include apiKey.",
      };
    }

    if (!propertyId) {
      return {
        success: false,
        revisions: [],
        providerStatus: "INVALID_REQUEST",
        errorCode: "MISSING_PROPERTY_ID",
        errorMessage: "Channex booking revision feed requires externalPropertyId.",
      };
    }

    try {
      const url = new URL("/api/v1/booking_revisions/feed", CHANNEX_BASE_URL);
      url.searchParams.set("filter[property_id]", propertyId);
      url.searchParams.set("order[inserted_at]", "asc");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-api-key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafely(rawText);

      if (!response.ok) {
        return {
          success: false,
          revisions: [],
          providerStatus: response.status === 401 ? "UNAUTHORIZED" : "BOOKING_FEED_FAILED",
          errorCode:
            parsed?.errors?.code ||
            parsed?.error?.code ||
            `CHANNEX_BOOKING_FEED_${response.status}`,
          errorMessage:
            parsed?.errors?.title ||
            parsed?.error?.message ||
            `Channex booking revision feed failed with status ${response.status}.`,
        };
      }

      const rows = Array.isArray(parsed?.data) ? parsed.data : [];
      return {
        success: true,
        revisions: rows.map((row) => normalizeChannexBookingRevision(row)).filter((row) => row.revisionId),
        providerStatus: "ACTIVE",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        revisions: [],
        providerStatus: "BOOKING_FEED_FAILED",
        errorCode: error?.code || error?.name || "CHANNEX_BOOKING_FEED_REQUEST_FAILED",
        errorMessage: error?.message || "Channex booking revision feed request failed.",
      };
    }
  }

  async getBookingRevision(credentials, revisionId) {
    const apiKey = requireStr(credentials?.apiKey);
    const normalizedRevisionId = requireStr(revisionId);

    if (!apiKey) {
      return {
        success: false,
        revision: null,
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        errorMessage: "Channex credentials must include apiKey.",
      };
    }

    if (!normalizedRevisionId) {
      return {
        success: false,
        revision: null,
        providerStatus: "INVALID_REQUEST",
        errorCode: "MISSING_BOOKING_REVISION_ID",
        errorMessage: "Channex booking revision fetch requires revisionId.",
      };
    }

    try {
      const url = new URL(`/api/v1/booking_revisions/${normalizedRevisionId}`, CHANNEX_BASE_URL);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-api-key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafely(rawText);

      if (!response.ok) {
        return {
          success: false,
          revision: null,
          providerStatus: response.status === 401 ? "UNAUTHORIZED" : "BOOKING_REVISION_GET_FAILED",
          errorCode:
            parsed?.errors?.code ||
            parsed?.error?.code ||
            `CHANNEX_BOOKING_REVISION_${response.status}`,
          errorMessage:
            parsed?.errors?.title ||
            parsed?.error?.message ||
            `Channex booking revision fetch failed with status ${response.status}.`,
        };
      }

      const row = parsed?.data && typeof parsed.data === "object" ? parsed.data : null;
      const revision = row ? normalizeChannexBookingRevision(row) : null;
      if (!revision?.revisionId) {
        return {
          success: false,
          revision: null,
          providerStatus: "INVALID_RESPONSE",
          errorCode: "CHANNEX_BOOKING_REVISION_INVALID_RESPONSE",
          errorMessage: "Channex booking revision response was missing a usable booking revision object.",
        };
      }

      return {
        success: true,
        revision,
        providerStatus: "ACTIVE",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        revision: null,
        providerStatus: "BOOKING_REVISION_GET_FAILED",
        errorCode: error?.code || error?.name || "CHANNEX_BOOKING_REVISION_REQUEST_FAILED",
        errorMessage: error?.message || "Channex booking revision request failed.",
      };
    }
  }

  async acknowledgeBookingRevision(credentials, revisionId) {
    const apiKey = requireStr(credentials?.apiKey);
    const normalizedRevisionId = requireStr(revisionId);

    if (!apiKey) {
      return {
        success: false,
        revisionId: normalizedRevisionId,
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        errorMessage: "Channex credentials must include apiKey.",
      };
    }

    if (!normalizedRevisionId) {
      return {
        success: false,
        revisionId: null,
        providerStatus: "INVALID_REQUEST",
        errorCode: "MISSING_BOOKING_REVISION_ID",
        errorMessage: "Channex booking revision acknowledge requires revisionId.",
      };
    }

    try {
      const url = new URL(`/api/v1/booking_revisions/${normalizedRevisionId}/ack`, CHANNEX_BASE_URL);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-api-key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafely(rawText);

      if (!response.ok) {
        return {
          success: false,
          revisionId: normalizedRevisionId,
          providerStatus: response.status === 401 ? "UNAUTHORIZED" : "BOOKING_REVISION_ACK_FAILED",
          errorCode:
            parsed?.errors?.code ||
            parsed?.error?.code ||
            `CHANNEX_BOOKING_ACK_${response.status}`,
          errorMessage:
            parsed?.errors?.title ||
            parsed?.error?.message ||
            `Channex booking revision acknowledge failed with status ${response.status}.`,
        };
      }

      return {
        success: true,
        revisionId: normalizedRevisionId,
        providerStatus: "ACKNOWLEDGED",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        revisionId: normalizedRevisionId,
        providerStatus: "BOOKING_REVISION_ACK_FAILED",
        errorCode: error?.code || error?.name || "CHANNEX_BOOKING_ACK_REQUEST_FAILED",
        errorMessage: error?.message || "Channex booking revision acknowledge request failed.",
      };
    }
  }
}
