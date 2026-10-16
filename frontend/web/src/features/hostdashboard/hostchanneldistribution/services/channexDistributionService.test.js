import { getChannexStatus as fetchRealChannexStatus } from "../../hostintegrations/channexApi";
import { getChannexStatus } from "./channexDistributionService";

jest.mock("../../hostintegrations/channexApi", () => ({
  getChannexStatus: jest.fn(),
}));

describe("channexDistributionService getChannexStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls the real channexApi helper without a userId and returns its result", async () => {
    const response = { channel: "CHANNEX", status: "CONNECTED" };
    fetchRealChannexStatus.mockResolvedValue(response);

    const result = await getChannexStatus();

    // The backend takes the user from the token. The empty object matters: channexApi
    // destructures its argument, so undefined would throw.
    expect(fetchRealChannexStatus).toHaveBeenCalledWith({});
    expect(result).toBe(response);
  });

  test("propagates a thrown error, including its status, unchanged", async () => {
    const error = new Error("GET /integrations/channex/status failed with status 403: Forbidden");
    error.status = 403;
    fetchRealChannexStatus.mockRejectedValue(error);

    await expect(getChannexStatus()).rejects.toBe(error);
  });
});
