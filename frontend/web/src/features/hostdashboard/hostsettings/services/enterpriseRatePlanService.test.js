import { getAccessToken, getCognitoUserId } from "../../../../services/getAccessToken";
import { getEnterpriseRatePlan } from "./enterpriseRatePlanService";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
  getCognitoUserId: jest.fn(),
}));

describe("getEnterpriseRatePlan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("access-token");
    getCognitoUserId.mockReturnValue("host-123");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("uses the authenticated user id for the enterprise request", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        activeProperties: 100,
        pricePerProperty: 49,
        currency: "EUR",
        estimatedMonthlyCost: 4900,
      }),
    });

    const result = await getEnterpriseRatePlan();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/enterprise/host-123",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "access-token" },
      })
    );
    expect(result.enterpriseId).toBe("host-123");
  });

  test("returns null when no active enterprise rate plan exists", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(getEnterpriseRatePlan()).resolves.toBeNull();
  });

  test("throws when the user is not signed in", async () => {
    getAccessToken.mockReturnValue(null);

    await expect(getEnterpriseRatePlan()).rejects.toThrow(
      "You must be signed in to load the enterprise rate plan."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("throws when no enterprise account can be identified", async () => {
    getCognitoUserId.mockReturnValue(null);

    await expect(getEnterpriseRatePlan()).rejects.toThrow(
      "No enterprise account could be identified."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
