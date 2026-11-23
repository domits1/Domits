import { describe, expect, it, jest } from "@jest/globals";
import { createTruviModifier } from "../../functions/Truvi-Integration/business/createTruviModifier.js";
import { TruviBookingModifier } from "../../functions/Truvi-Integration/business/truviBookingModifier.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("createTruviModifier", () => {
  it("builds a modifier with the key from the secret", async () => {
    const secretRepository = { getSubscriptionKey: jest.fn(async () => "key-from-secret") };

    const modifier = await createTruviModifier({ env: { TRUVI_EXTENDED_AMOUNT: "1000" }, secretRepository });

    expect(modifier).toBeInstanceOf(TruviBookingModifier);
    expect(modifier.apiClient.subscriptionKey).toBe("key-from-secret");
  });
});
