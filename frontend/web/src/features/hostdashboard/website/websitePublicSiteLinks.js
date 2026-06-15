const DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX = "direct.domits.com";

const cleanWebsiteText = (value) => String(value || "").replaceAll(/\s+/g, " ").trim();
const isAsciiLowercaseLetter = (value) => value >= "a" && value <= "z";
const isAsciiDigit = (value) => value >= "0" && value <= "9";
const isAsciiLowercaseLetterOrDigit = (value) => isAsciiLowercaseLetter(value) || isAsciiDigit(value);

const trimRepeatedCharacterEdges = (value, character) => {
  let startIndex = 0;
  let endIndex = value.length;

  while (startIndex < endIndex && value[startIndex] === character) {
    startIndex += 1;
  }

  while (endIndex > startIndex && value[endIndex - 1] === character) {
    endIndex -= 1;
  }

  return value.slice(startIndex, endIndex);
};

const slugifyWebsiteDomainLabel = (value) => {
  const normalizedValue = cleanWebsiteText(value).normalize("NFKD").toLowerCase();
  let sanitizedValue = "";
  let previousCharacterWasHyphen = false;

  for (const currentCharacter of normalizedValue) {
    const isAsciiCharacter = (currentCharacter.codePointAt(0) || 0) <= 0x7f;
    if (!isAsciiCharacter) {
      continue;
    }

    if (isAsciiLowercaseLetterOrDigit(currentCharacter)) {
      sanitizedValue += currentCharacter;
      previousCharacterWasHyphen = false;
      continue;
    }

    if (!previousCharacterWasHyphen) {
      sanitizedValue += "-";
      previousCharacterWasHyphen = true;
    }
  }

  sanitizedValue = trimRepeatedCharacterEdges(sanitizedValue, "-");
  return sanitizedValue || "site";
};

const normalizePublishedWebsiteIdSuffix = (value) =>
  cleanWebsiteText(value)
    .toLowerCase()
    .split("")
    .filter((currentCharacter) => isAsciiLowercaseLetterOrDigit(currentCharacter))
    .join("");

const buildPublishedWebsiteDomainLabel = (siteName, siteId) => {
  const slugBase = trimRepeatedCharacterEdges(slugifyWebsiteDomainLabel(siteName).slice(0, 40), "-") || "site";
  const idSuffix = normalizePublishedWebsiteIdSuffix(siteId).slice(0, 8) || "domits";
  const combinedLabel = `${slugBase}-${idSuffix}`;
  return trimRepeatedCharacterEdges(combinedLabel.slice(0, 63), "-");
};

export const resolvePublishedWebsiteDomain = (domain = "", siteName = "", siteId = "") => {
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (normalizedDomain) {
    return normalizedDomain;
  }

  const normalizedSiteId = String(siteId || "").trim();
  if (!normalizedSiteId) {
    return "";
  }

  return `${buildPublishedWebsiteDomainLabel(siteName, normalizedSiteId)}.${DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX}`;
};

export const buildPublishedWebsitePath = (domain = "", siteId = "", siteName = "") => {
  const normalizedDomain = resolvePublishedWebsiteDomain(domain, siteName, siteId);
  const normalizedSiteId = String(siteId || "").trim();
  if (!normalizedDomain) {
    return normalizedSiteId ? `/website-live?siteId=${encodeURIComponent(normalizedSiteId)}` : "";
  }

  const path = `/website-live/${encodeURIComponent(normalizedDomain)}`;
  return normalizedSiteId ? `${path}?siteId=${encodeURIComponent(normalizedSiteId)}` : path;
};

export const buildWebsitePreviewPath = (draftId) =>
  `/website-preview/${encodeURIComponent(String(draftId || "").trim())}`;

export const buildPublishedWebsiteHref = (domain, siteId = "", domainStatus = "", siteName = "") => {
  const normalizedDomain = resolvePublishedWebsiteDomain(domain, siteName, siteId);

  if (normalizedDomain && String(domainStatus || "").trim().toUpperCase() === "ACTIVE") {
    return `https://${normalizedDomain}`;
  }

  return buildPublishedWebsitePath(normalizedDomain, siteId, siteName);
};
