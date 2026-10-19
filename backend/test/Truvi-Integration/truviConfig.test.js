import { describe, expect, it } from "@jest/globals";
import { DEFAULT_SECRET_NAME, readTruviConfig } from "../../functions/Truvi-Integration/util/truviConfig.js";
import { TRUVI_SANDBOX_URL } from "../../functions/Truvi-Integration/data/truviApiClient.js";

describe("readTruviConfig", () => {
  it("uses the sandbox and the default secret when only the amount is set", () => {
    expect(readTruviConfig({ TRUVI_EXTENDED_AMOUNT: "1000" })).toEqual({
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

  it("refuses a base url without https", () => {
    expect(() => readTruviConfig({ TRUVI_EXTENDED_AMOUNT: "1000", TRUVI_BASE_URL: "http://truvi.example" })).toThrow(
      "https"
    );
  });
});
