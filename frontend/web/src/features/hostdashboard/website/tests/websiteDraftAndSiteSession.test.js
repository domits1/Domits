import { Auth } from "aws-amplify";
import {
  deleteWebsiteDraft,
  fetchWebsiteDraftByPropertyId,
  fetchWebsiteDrafts,
  upsertWebsiteDraft,
} from "../services/websiteDraftService";
import { fetchWebsiteSiteByPropertyId, publishWebsiteSite, unpublishWebsiteSite } from "../services/websiteSiteService";
import { WEBSITE_SESSION_EXPIRED_MESSAGE } from "../services/websiteSession";
import { fetchWebsiteKpis } from "../kpis/services/websiteKpiService";
import { getAccessToken } from "../../../../services/getAccessToken";

jest.mock("aws-amplify", () => ({ Auth: { currentSession: jest.fn() } }));
jest.mock("../../../../services/getAccessToken", () => ({ getAccessToken: jest.fn(() => "stale-local-token") }));

const sessionWith = (accessToken) => ({ getAccessToken: () => ({ getJwtToken: () => accessToken }) });
const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const CALLS = [
  ["fetchWebsiteDrafts", () => fetchWebsiteDrafts(), jsonResponse(200, [])],
  ["fetchWebsiteDraftByPropertyId", () => fetchWebsiteDraftByPropertyId("p1"), jsonResponse(200, {})],
  [
    "upsertWebsiteDraft",
    () => upsertWebsiteDraft({ propertyId: "p1", templateKey: "panorama" }),
    jsonResponse(200, {}),
  ],
  ["deleteWebsiteDraft", () => deleteWebsiteDraft("p1"), jsonResponse(200, {})],
  ["fetchWebsiteSiteByPropertyId", () => fetchWebsiteSiteByPropertyId("p1"), jsonResponse(200, {})],
  ["publishWebsiteSite", () => publishWebsiteSite("p1"), jsonResponse(200, {})],
  ["unpublishWebsiteSite", () => unpublishWebsiteSite("p1"), jsonResponse(200, {})],
  ["fetchWebsiteKpis", () => fetchWebsiteKpis(), jsonResponse(200, {})],
];

describe("website draft and site requests and the login session", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    Auth.currentSession.mockReset();
    getAccessToken.mockReturnValue("stale-local-token");
  });

  it.each(CALLS)("%s sends the token of the current session, not the stored one", async (_name, call, ok) => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(ok);

    await call();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("fresh-token");
  });

  it.each(CALLS)("%s shows the session expired message when the session cannot be refreshed", async (_name, call) => {
    Auth.currentSession.mockRejectedValue(
      Object.assign(new Error("Refresh Token has expired"), { code: "NotAuthorizedException" })
    );

    await expect(call()).rejects.toThrow(WEBSITE_SESSION_EXPIRED_MESSAGE);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(CALLS)("%s shows the session expired message when the backend still answers 401", async (_name, call) => {
    Auth.currentSession.mockResolvedValue(sessionWith("revoked-token"));
    global.fetch.mockResolvedValue(jsonResponse(401, { message: "You must be logged in." }));

    await expect(call()).rejects.toThrow(WEBSITE_SESSION_EXPIRED_MESSAGE);
  });

  it("saves the draft after one retry when the token expired on the way", async () => {
    Auth.currentSession
      .mockResolvedValueOnce(sessionWith("expiring-token"))
      .mockResolvedValueOnce(sessionWith("refreshed-token"));
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { message: "You must be logged in." }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "draft-1" }));

    await expect(upsertWebsiteDraft({ propertyId: "p1", templateKey: "panorama" })).resolves.toEqual({ id: "draft-1" });
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe("refreshed-token");
    expect(global.fetch.mock.calls[1][1].body).toBe(global.fetch.mock.calls[0][1].body);
  });

  it("shows the reason from the backend for a 403", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(
      jsonResponse(403, { message: "You must be the owner of the property to access it." })
    );

    await expect(upsertWebsiteDraft({ propertyId: "p1", templateKey: "panorama" })).rejects.toThrow(
      "You must be the owner of the property to access it."
    );
  });

  it("does not look up the live site after an expired session on publish", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("revoked-token"));
    global.fetch.mockResolvedValue(jsonResponse(401, { message: "You must be logged in." }));

    await expect(publishWebsiteSite("p1")).rejects.toThrow(WEBSITE_SESSION_EXPIRED_MESSAGE);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("still returns the live site when publish fails on the server but the site is published", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch
      .mockResolvedValueOnce(
        jsonResponse(500, { message: "We could not complete this website request. Please try again." })
      )
      .mockResolvedValueOnce(jsonResponse(200, { site: { status: "PUBLISHED" }, domains: [] }));

    await expect(publishWebsiteSite("p1")).resolves.toMatchObject({ site: { status: "PUBLISHED" } });
    expect(global.fetch.mock.calls[1][0]).toContain("/website/site?property=p1");
  });
});
