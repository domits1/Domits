import {
  getChannexStatus as fetchRealChannexStatus,
  getLatestChannexSyncEvidence,
  getLinkedChannexRoomTypes,
} from "../../hostintegrations/channexApi";
import { getAccessToken } from "../../../../services/getAccessToken";
import { fetchListingsFromHostDashboard } from "../../../../services/hostPropertyService";
import { getChannexStatus, getLatestSyncEvidence, getMappedProperties } from "./channexDistributionService";

jest.mock("../../hostintegrations/channexApi", () => ({
  getChannexStatus: jest.fn(),
  getLatestChannexSyncEvidence: jest.fn(),
  getLinkedChannexRoomTypes: jest.fn(),
}));
jest.mock("../../../../services/getAccessToken", () => ({ getAccessToken: jest.fn() }));
jest.mock("../../../../services/hostPropertyService", () => ({ fetchListingsFromHostDashboard: jest.fn() }));

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

describe("channexDistributionService getLatestSyncEvidence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("asks the real endpoint for the given property only, without a userId, and returns its result", async () => {
    const response = { channel: "CHANNEX", domitsPropertyId: "property-1", item: null };
    getLatestChannexSyncEvidence.mockResolvedValue(response);

    const result = await getLatestSyncEvidence({ domitsPropertyId: "property-1" });

    // The backend takes the user from the token, so only the property is sent.
    expect(getLatestChannexSyncEvidence).toHaveBeenCalledWith({ domitsPropertyId: "property-1" });
    expect(result).toBe(response);
  });

  test("propagates a thrown error, including its status and body, unchanged", async () => {
    const error = Object.assign(new Error("not found"), { status: 404, responseBody: { errorCode: "CHANNEX_NOT_FOUND" } });
    getLatestChannexSyncEvidence.mockRejectedValue(error);

    await expect(getLatestSyncEvidence({ domitsPropertyId: "property-1" })).rejects.toBe(error);
  });
});

describe("channexDistributionService getMappedProperties", () => {
  const CANAL = { property: { id: "property-1", title: "Canal house" } };
  const BEACH = { property: { id: "property-2", title: "Beach apartment" } };
  const UNLINKED = { property: { id: "property-3", title: "Unlinked loft" } };

  const withStatus = (message, status) => Object.assign(new Error(message), { status });

  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("access-token-1");
  });

  test("keeps only the listings that have a linked room type, and collapses repeated property ids", async () => {
    getLinkedChannexRoomTypes.mockResolvedValue({
      roomTypeMappings: [
        { domitsPropertyId: "property-1" },
        { domitsPropertyId: "property-1" },
        { domitsPropertyId: "property-2" },
      ],
    });
    fetchListingsFromHostDashboard.mockResolvedValue({ listings: [CANAL, BEACH, UNLINKED], status: 200 });

    const result = await getMappedProperties();

    expect(result).toEqual([CANAL, BEACH]);
    expect(fetchListingsFromHostDashboard).toHaveBeenCalledWith("access-token-1");
  });

  test("includes a mapping whatever its status, because the schema does not define the status values", async () => {
    getLinkedChannexRoomTypes.mockResolvedValue({
      roomTypeMappings: [{ domitsPropertyId: "property-1", status: "SOMETHING_ELSE" }],
    });
    fetchListingsFromHostDashboard.mockResolvedValue({ listings: [CANAL, BEACH], status: 200 });

    expect(await getMappedProperties()).toEqual([CANAL]);
  });

  test("returns an empty list without calling hostDashboard/all when there are no mappings", async () => {
    getLinkedChannexRoomTypes.mockResolvedValue({ roomTypeMappings: [] });

    expect(await getMappedProperties()).toEqual([]);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchListingsFromHostDashboard).not.toHaveBeenCalled();
  });

  test("ignores mappings without a property id, so they neither trigger hostDashboard/all nor match a listing", async () => {
    getLinkedChannexRoomTypes.mockResolvedValue({ roomTypeMappings: [{ status: "ACTIVE" }, { domitsPropertyId: "" }] });

    expect(await getMappedProperties()).toEqual([]);
    expect(fetchListingsFromHostDashboard).not.toHaveBeenCalled();
  });

  test("returns an empty list when the response has no roomTypeMappings array", async () => {
    getLinkedChannexRoomTypes.mockResolvedValue({});

    expect(await getMappedProperties()).toEqual([]);
    expect(fetchListingsFromHostDashboard).not.toHaveBeenCalled();
  });

  test("treats a 404 from hostDashboard/all as a host with no properties", async () => {
    getLinkedChannexRoomTypes.mockResolvedValue({ roomTypeMappings: [{ domitsPropertyId: "property-1" }] });
    fetchListingsFromHostDashboard.mockResolvedValue({ listings: null, status: 404 });

    expect(await getMappedProperties()).toEqual([]);
  });

  test.each([500, 403])("rejects with the status when hostDashboard/all fails with %s", async (status) => {
    getLinkedChannexRoomTypes.mockResolvedValue({ roomTypeMappings: [{ domitsPropertyId: "property-1" }] });
    fetchListingsFromHostDashboard.mockResolvedValue({ listings: null, status });

    await expect(getMappedProperties()).rejects.toMatchObject({ status });
  });

  test("rejects, and does not call hostDashboard/all, when there is no access token", async () => {
    getLinkedChannexRoomTypes.mockResolvedValue({ roomTypeMappings: [{ domitsPropertyId: "property-1" }] });
    getAccessToken.mockReturnValue(null);

    await expect(getMappedProperties()).rejects.toThrow("access token");
    expect(fetchListingsFromHostDashboard).not.toHaveBeenCalled();
  });

  test("passes a 409 from linked-room-types on unchanged and does not call hostDashboard/all", async () => {
    const conflict = withStatus("Channex integration is not connected for this user.", 409);
    getLinkedChannexRoomTypes.mockRejectedValue(conflict);

    await expect(getMappedProperties()).rejects.toBe(conflict);
    expect(fetchListingsFromHostDashboard).not.toHaveBeenCalled();
  });
});
