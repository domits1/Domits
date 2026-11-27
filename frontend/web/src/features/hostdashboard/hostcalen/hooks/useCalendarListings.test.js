import { renderHook, waitFor } from "@testing-library/react";
import { useCalendarListings } from "./useCalendarListings";
import { getAccessToken, getCognitoUserId } from "../../../../services/getAccessToken";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
  getCognitoUserId: jest.fn(),
}));

const respond = (status, body = []) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

describe("useCalendarListings", () => {
  beforeEach(() => {
    getAccessToken.mockReturnValue("token");
    getCognitoUserId.mockReturnValue("host-1");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("shows no error when the host simply has no listings yet (404 from both endpoints)", async () => {
    global.fetch.mockImplementation(() => respond(404, "No property found."));

    const { result } = renderHook(() => useCalendarListings());

    await waitFor(() => expect(result.current.isLoadingListings).toBe(false));
    expect(result.current.listingsError).toBe("");
    expect(result.current.accommodations).toEqual([]);
  });

  test("still reports the status when listings cannot be loaded because of a server error", async () => {
    global.fetch.mockImplementation(() => respond(500, "Something went wrong"));

    const { result } = renderHook(() => useCalendarListings());

    await waitFor(() => expect(result.current.isLoadingListings).toBe(false));
    expect(result.current.listingsError).toBe("Could not load listings (500).");
  });

  test("loads the listings when the host has some", async () => {
    const listings = [{ property: { id: "property-1", title: "Villa" } }];
    global.fetch.mockImplementation(() => respond(200, listings));

    const { result } = renderHook(() => useCalendarListings());

    await waitFor(() => expect(result.current.accommodations).toEqual(listings));
    expect(result.current.listingsError).toBe("");
    expect(result.current.selectedPropertyId).toBe("property-1");
  });
});
