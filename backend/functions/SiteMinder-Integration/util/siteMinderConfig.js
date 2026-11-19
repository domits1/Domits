export const SITEMINDER_CHANNEL = "SITEMINDER";

const CURRENCY = /^[A-Z]{3}$/;

export const readSiteMinderConfig = (env = process.env) => {
  const pmsCode = String(env.SITEMINDER_PMS_CODE ?? "").trim();
  if (!pmsCode) {
    throw new Error("SITEMINDER_PMS_CODE is required");
  }
  const currency = String(env.SITEMINDER_CURRENCY ?? "EUR").trim().toUpperCase();
  if (!CURRENCY.test(currency)) {
    throw new Error("SITEMINDER_CURRENCY must be a 3-letter code such as EUR");
  }
  const baseUrl = String(env.SITEMINDER_BASE_URL ?? "").trim() || undefined;
  if (baseUrl && !baseUrl.startsWith("https://")) {
    throw new Error("SITEMINDER_BASE_URL must use https");
  }
  return {
    pmsCode,
    currency,
    baseUrl,
    secretName: String(env.SITEMINDER_SECRET_NAME ?? "").trim() || "domits/siteminder/pmsxchange",
  };
};
