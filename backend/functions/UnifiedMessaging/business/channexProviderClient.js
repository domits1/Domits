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
}
