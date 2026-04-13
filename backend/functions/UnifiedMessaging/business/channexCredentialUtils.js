const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const maskSecret = (value) => {
  const raw = requireStr(value);
  if (!raw) return null;
  if (raw.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, raw.length - 4))}${raw.slice(-4)}`;
};

export const buildDefaultChannexProviderValidation = () => ({
  validationState: "PENDING_PROVIDER_VALIDATION",
  providerStatus: "NOT_EVALUATED",
  validationMethod: "API_KEY_PROPERTIES_LIST",
  attemptedAt: null,
  validatedAt: null,
  externalAccountId: null,
  errorCode: null,
  errorMessage: null,
});

export const normalizeChannexCredentials = (credentials) => {
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    return null;
  }

  const apiKey = requireStr(credentials.apiKey);
  if (!apiKey) {
    return null;
  }

  const normalized = { apiKey };

  for (const [key, value] of Object.entries(credentials)) {
    if (key === "apiKey") continue;

    const normalizedValue = requireStr(value);
    if (normalizedValue) {
      normalized[key] = normalizedValue;
    }
  }

  return normalized;
};

export const buildChannexCredentialSummary = (credentials) => ({
  hasApiKey: !!requireStr(credentials?.apiKey),
  apiKeyMasked: maskSecret(credentials?.apiKey),
});

export const hasChannexRequiredCredentialFields = (credentials) => !!requireStr(credentials?.apiKey);

export const summarizeChannexRequiredFields = (credentials) => ({
  hasApiKey: !!requireStr(credentials?.apiKey),
  requiredFieldsPresent: hasChannexRequiredCredentialFields(credentials),
});

export const normalizeChannexProviderValidation = (providerValidation) => {
  const defaults = buildDefaultChannexProviderValidation();

  if (!providerValidation || typeof providerValidation !== "object" || Array.isArray(providerValidation)) {
    return defaults;
  }

  return {
    validationState: requireStr(providerValidation.validationState) || defaults.validationState,
    providerStatus: requireStr(providerValidation.providerStatus) || defaults.providerStatus,
    validationMethod: requireStr(providerValidation.validationMethod) || defaults.validationMethod,
    attemptedAt: Number.isFinite(Number(providerValidation.attemptedAt)) ? Number(providerValidation.attemptedAt) : null,
    validatedAt: Number.isFinite(Number(providerValidation.validatedAt)) ? Number(providerValidation.validatedAt) : null,
    externalAccountId: requireStr(providerValidation.externalAccountId),
    errorCode: requireStr(providerValidation.errorCode),
    errorMessage: requireStr(providerValidation.errorMessage),
  };
};
