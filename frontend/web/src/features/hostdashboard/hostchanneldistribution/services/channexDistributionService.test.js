import { getChannexStatus as fetchRealChannexStatus } from "../../hostintegrations/channexApi";
import { getChannexStatus } from "./channexDistributionService";

jest.mock("../../hostintegrations/channexApi", () => ({
  getChannexStatus: jest.fn(),
}));

describe("channexDistributionService getChannexStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("passes userId through to the real channexApi helper and returns its result", async () => {
    const response = { channel: "CHANNEX", status: "CONNECTED" };
    fetchRealChannexStatus.mockResolvedValue(response);

    const result = await getChannexStatus({ userId: "user-1" });

    expect(fetchRealChannexStatus).toHaveBeenCalledWith({ userId: "user-1" });
    expect(result).toBe(response);
  });

  test("propagates a thrown error, including its status, unchanged", async () => {
    const error = new Error("GET /integrations/channex/status failed with status 403: Forbidden");
    error.status = 403;
    fetchRealChannexStatus.mockRejectedValue(error);

    await expect(getChannexStatus({ userId: "user-1" })).rejects.toBe(error);
  });
});
