const DOMAIN_TYPE_CUSTOM = "CUSTOM";

const toDnsRecord = (dnsInstruction) =>
  dnsInstruction && typeof dnsInstruction === "object"
    ? {
        type: String(dnsInstruction.type || ""),
        name: String(dnsInstruction.name || ""),
        value: String(dnsInstruction.value || ""),
      }
    : null;

export const toHostWebsiteDomainView = (record) => {
  if (!record) {
    return null;
  }

  const isCustom = record.domainType === DOMAIN_TYPE_CUSTOM;
  const details = isCustom && record.verificationDetails ? record.verificationDetails : {};

  return {
    domain: record.domain,
    domainType: record.domainType,
    status: record.status,
    isPrimary: Boolean(record.isPrimary),
    dnsRecord: toDnsRecord(details.dnsInstruction),
    dnsVerified: details.dnsVerified ?? null,
    certificateStatus: details.certificateStatus ?? null,
    reason: details.reason ?? null,
    lastError: details.lastError ?? null,
    lastCheckedAt: record.lastCheckedAt ?? null,
  };
};
