import { describe, expect, it, jest } from "@jest/globals";
import { createTruviScreener } from "../../functions/Truvi-Integration/business/createTruviScreener.js";
import { TruviBookingScreener } from "../../functions/Truvi-Integration/business/truviBookingScreener.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("createTruviScreener", () => {
  it("builds a screener with the key from the secret and the amount from the environment", async () => {
    const secretRepository = { getSubscriptionKey: jest.fn(async () => "key-from-secret") };

    const screener = await createTruviScreener({ env: { TRUVI_EXTENDED_AMOUNT: "1000" }, secretRepository });

    expect(screener).toBeInstanceOf(TruviBookingScreener);
    expect(screener.extendedAmount).toBe(1000);
    expect(screener.screeningService.apiClient.subscriptionKey).toBe("key-from-secret");
    expect(secretRepository.getSubscriptionKey).toHaveBeenCalledTimes(1);
  });

  it("stops before reading the secret when the amount is missing", async () => {
    const secretRepository = { getSubscriptionKey: jest.fn() };

    await expect(createTruviScreener({ env: {}, secretRepository })).rejects.toThrow("TRUVI_EXTENDED_AMOUNT");
    expect(secretRepository.getSubscriptionKey).not.toHaveBeenCalled();
  });
});
