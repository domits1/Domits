const CHANNEX_BASE_URL = process.env.CHANNEX_BASE_URL || "https://staging.channex.io";

const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const parseJsonSafely = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
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
          providerStatus: response.status === 401 ? "UNAUTHORIZED" : "VALIDATION_FAILED",
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
          providerStatus: response.status === 401 ? "UNAUTHORIZED" : "PROPERTY_LIST_FAILED",
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
          providerStatus: response.status === 401 ? "UNAUTHORIZED" : "ROOM_TYPE_LIST_FAILED",
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

          return {
            externalRoomTypeId,
            externalRoomTypeName:
              requireStr(row?.attributes?.title) ||
              requireStr(row?.attributes?.name) ||
              null,
            roomTypeStatus: requireStr(row?.attributes?.state) || null,
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
          providerStatus: response.status === 401 ? "UNAUTHORIZED" : "RATE_PLAN_LIST_FAILED",
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
}
