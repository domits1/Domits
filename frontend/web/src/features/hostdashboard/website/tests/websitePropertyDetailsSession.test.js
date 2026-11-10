import { Auth } from "aws-amplify";
import { fetchWebsitePropertyDetails } from "../services/websitePropertyService";
import { WEBSITE_SESSION_EXPIRED_MESSAGE } from "../services/websiteSession";
import { getAccessToken, getIdToken } from "../../../../services/getAccessToken";

jest.mock("aws-amplify", () => ({ Auth: { currentSession: jest.fn() } }));
jest.mock("../../../../services/getAccessToken", () => ({ getAccessToken: jest.fn(), getIdToken: jest.fn() }));
jest.mock("../../../../utils/icalRetrieveHost", () => ({ dbListIcalSources: jest.fn(async () => null) }));

const sessionWith = (accessToken) => ({ getAccessToken: () => ({ getJwtToken: () => accessToken }) });
const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("loading the listing for the website editor", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    Auth.currentSession.mockReset();
    getAccessToken.mockReturnValue("stale-local-token");
    getIdToken.mockResolvedValue(null);
  });

  it("loads the listing with the token of the current session, not the stored one", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(jsonResponse(200, { property: { id: "p1" } }));

    await fetchWebsitePropertyDetails("p1");

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("fresh-token");
  });

  it("shows the session expired message without a request when the session cannot be refreshed", async () => {
    Auth.currentSession.mockRejectedValue("No current user");

    await expect(fetchWebsitePropertyDetails("p1")).rejects.toThrow(WEBSITE_SESSION_EXPIRED_MESSAGE);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows the session expired message when the backend still answers 401", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("revoked-token"));
    global.fetch.mockResolvedValue(jsonResponse(401, { message: "You must be logged in." }));

    await expect(fetchWebsitePropertyDetails("p1")).rejects.toThrow(WEBSITE_SESSION_EXPIRED_MESSAGE);
  });

  it("shows the reason from the backend for a 403", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(jsonResponse(403, "You must be the owner of the property to access it."));

    await expect(fetchWebsitePropertyDetails("p1")).rejects.toThrow(
      "You must be the owner of the property to access it."
    );
  });
});
