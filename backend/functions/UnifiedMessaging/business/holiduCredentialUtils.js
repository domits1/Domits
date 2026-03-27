const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const maskSecret = (value) => {
  const raw = requireStr(value);
  if (!raw) return null;
  if (raw.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, raw.length - 4))}${raw.slice(-4)}`;
};

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
});

export const buildHoliduCredentialSummary = (credentials) => ({
  hasApiKey: !!requireStr(credentials?.apiKey),
  apiKeyMasked: maskSecret(credentials?.apiKey),
  hasClientId: !!requireStr(credentials?.clientId),
  clientIdMasked: maskSecret(credentials?.clientId),
  hasClientSecret: !!requireStr(credentials?.clientSecret),
  clientSecretMasked: maskSecret(credentials?.clientSecret),
  notes: requireStr(credentials?.notes),
});
