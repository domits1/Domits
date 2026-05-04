const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const normalizeNullableString = (value) => requireStr(value) || null;

const maskSecret = (value) => {
  const raw = requireStr(value);
  if (!raw) return null;
  if (raw.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, raw.length - 4))}${raw.slice(-4)}`;
};

export const buildDefaultHoliduProviderValidation = () => ({
  validationState: "PENDING_PROVIDER_VALIDATION",
  providerStatus: "NOT_EVALUATED",
  validationMethod: "REPO_DOCS_CONTRACT_REQUIRED",
  attemptedAt: null,
  validatedAt: null,
  externalAccountId: null,
  errorCode: null,
  errorMessage: null,
});

export const normalizeHoliduCredentials = (credentials) => {
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    return null;
  }

  const normalized = {
    apiKey: requireStr(credentials.apiKey),
    clientId: requireStr(credentials.clientId),
    clientSecret: requireStr(credentials.clientSecret),
    notes: requireStr(credentials.notes),
  };

  const hasAnyCredential =
    normalized.apiKey || normalized.clientId || normalized.clientSecret || normalized.notes;

  if (!hasAnyCredential) {
    return null;
  }

  return normalized;
};

export const buildHoliduSecretPayload = ({ credentials, connectedAt, updatedAt }) => ({
  provider: "HOLIDU",
  credentialType: "MANUAL_CONNECT",
  apiKey: credentials.apiKey,
  clientId: credentials.clientId,
  clientSecret: credentials.clientSecret,
  notes: credentials.notes,
  connectedAt,
  updatedAt,
  providerValidation: buildDefaultHoliduProviderValidation(),
});

export const buildHoliduCredentialSummary = (credentials) => ({
  hasApiKey: !!requireStr(credentials?.apiKey),
  apiKeyMasked: maskSecret(credentials?.apiKey),
  hasClientId: !!requireStr(credentials?.clientId),
  clientIdMasked: maskSecret(credentials?.clientId),
  hasClientSecret: !!requireStr(credentials?.clientSecret),
  clientSecretMasked: maskSecret(credentials?.clientSecret),
});

export const hasHoliduRequiredCredentialFields = (credentials) => {
  const apiKey = requireStr(credentials?.apiKey);
  const clientId = requireStr(credentials?.clientId);
  const clientSecret = requireStr(credentials?.clientSecret);

  return !!apiKey || (!!clientId && !!clientSecret);
};

export const summarizeHoliduRequiredFields = (credentials) => ({
  hasApiKey: !!requireStr(credentials?.apiKey),
  hasClientId: !!requireStr(credentials?.clientId),
  hasClientSecret: !!requireStr(credentials?.clientSecret),
  requiredFieldsPresent: hasHoliduRequiredCredentialFields(credentials),
});

export const normalizeHoliduProviderValidation = (providerValidation) => {
  if (!providerValidation || typeof providerValidation !== "object" || Array.isArray(providerValidation)) {
    return buildDefaultHoliduProviderValidation();
  }

  return {
    validationState:
      normalizeNullableString(providerValidation.validationState) ||
      buildDefaultHoliduProviderValidation().validationState,
    providerStatus:
      normalizeNullableString(providerValidation.providerStatus) || buildDefaultHoliduProviderValidation().providerStatus,
    validationMethod:
      normalizeNullableString(providerValidation.validationMethod) ||
      buildDefaultHoliduProviderValidation().validationMethod,
    attemptedAt: Number.isFinite(Number(providerValidation.attemptedAt))
      ? Number(providerValidation.attemptedAt)
      : null,
    validatedAt: Number.isFinite(Number(providerValidation.validatedAt))
      ? Number(providerValidation.validatedAt)
      : null,
    externalAccountId: normalizeNullableString(providerValidation.externalAccountId),
    errorCode: normalizeNullableString(providerValidation.errorCode),
    errorMessage: normalizeNullableString(providerValidation.errorMessage),
  };
};
