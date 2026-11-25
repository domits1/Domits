import { describe, expect, it } from "@jest/globals";
import { DEFAULT_SECRET_NAME, readTruviConfig } from "../../functions/Truvi-Integration/util/truviConfig.js";
import { TRUVI_SANDBOX_URL } from "../../functions/Truvi-Integration/data/truviApiClient.js";

describe("readTruviConfig", () => {
  it("uses the default secret when only the amount and the base url are set", () => {
    expect(readTruviConfig({ TRUVI_EXTENDED_AMOUNT: "1000", TRUVI_BASE_URL: TRUVI_SANDBOX_URL })).toEqual({
      secretName: DEFAULT_SECRET_NAME,
      baseUrl: TRUVI_SANDBOX_URL,
      extendedAmount: 1000,
    });
  });

  it("reads the secret name and base url from the environment", () => {
    const config = readTruviConfig({
      TRUVI_EXTENDED_AMOUNT: "500",
      TRUVI_SECRET_NAME: " domits/truvi/production ",
      TRUVI_BASE_URL: "https://api.truvi.example/screen-and-protect",
    });
    expect(config).toEqual({
      secretName: "domits/truvi/production",
      baseUrl: "https://api.truvi.example/screen-and-protect",
      extendedAmount: 500,
    });
  });

  it.each([[undefined], [""], ["123"], ["abc"]])("refuses an extended amount of %p", (amount) => {
    expect(() => readTruviConfig({ TRUVI_EXTENDED_AMOUNT: amount })).toThrow("TRUVI_EXTENDED_AMOUNT");
  });

  it.each([[undefined], [""], ["  "]])("refuses to fall back to the sandbox when TRUVI_BASE_URL is %p", (baseUrl) => {
    expect(() => readTruviConfig({ TRUVI_EXTENDED_AMOUNT: "1000", TRUVI_BASE_URL: baseUrl })).toThrow(
      "TRUVI_BASE_URL is required"
    );
  });

  it("refuses a base url without https", () => {
    expect(() => readTruviConfig({ TRUVI_EXTENDED_AMOUNT: "1000", TRUVI_BASE_URL: "http://truvi.example" })).toThrow(
      "https"
    );
  });
});
