import { TRUVI_SANDBOX_URL } from "../data/truviApiClient.js";

export const DEFAULT_SECRET_NAME = "domits/truvi/subscription-key";

const ALLOWED_EXTENDED_AMOUNTS = new Set([250, 500, 1000, 10000, 50000]);

export const readTruviConfig = (env = process.env) => {
  const extendedAmount = Number(String(env.TRUVI_EXTENDED_AMOUNT ?? "").trim());
  if (!ALLOWED_EXTENDED_AMOUNTS.has(extendedAmount)) {
    throw new Error("TRUVI_EXTENDED_AMOUNT must be one of 250, 500, 1000, 10000, 50000");
  }

  const baseUrl = String(env.TRUVI_BASE_URL ?? "").trim() || TRUVI_SANDBOX_URL;
  if (!baseUrl.startsWith("https://")) {
    throw new Error("TRUVI_BASE_URL must use https");
  }

  return {
    secretName: String(env.TRUVI_SECRET_NAME ?? "").trim() || DEFAULT_SECRET_NAME,
    baseUrl,
    extendedAmount,
  };
};
