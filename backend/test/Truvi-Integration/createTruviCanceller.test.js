import { describe, expect, it, jest } from "@jest/globals";
import { createTruviCanceller } from "../../functions/Truvi-Integration/business/createTruviCanceller.js";
import { TruviBookingCanceller } from "../../functions/Truvi-Integration/business/truviBookingCanceller.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("createTruviCanceller", () => {
  it("builds a canceller with the key from the secret", async () => {
    const secretRepository = { getSubscriptionKey: jest.fn(async () => "key-from-secret") };

    const canceller = await createTruviCanceller({ env: { TRUVI_EXTENDED_AMOUNT: "1000" }, secretRepository });

    expect(canceller).toBeInstanceOf(TruviBookingCanceller);
    expect(canceller.apiClient.subscriptionKey).toBe("key-from-secret");
  });
});
