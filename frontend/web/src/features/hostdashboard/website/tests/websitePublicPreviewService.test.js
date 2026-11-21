import { Auth } from "aws-amplify";
import {
  WEBSITE_PREVIEW_LOGIN_MESSAGE,
  fetchWebsitePreviewByDraftId,
} from "../services/websitePublicPreviewService";

jest.mock("aws-amplify", () => ({ Auth: { currentSession: jest.fn(), userPool: { getCurrentUser: jest.fn() } } }));

const sessionWith = (accessToken) => ({ getAccessToken: () => ({ getJwtToken: () => accessToken }) });

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const PREVIEW = { draft: { id: "draft-1" }, propertyDetails: { property: { id: "property-1" } }, host: {} };

describe("websitePublicPreviewService", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    Auth.currentSession.mockReset();
    Auth.currentSession.mockResolvedValue(sessionWith("access-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(null);
  });

  it("asks for the preview with the host's token", async () => {
    fetch.mockResolvedValue(jsonResponse(200, PREVIEW));

    await expect(fetchWebsitePreviewByDraftId(" draft-1 ")).resolves.toEqual(PREVIEW);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/website\/preview\?draft=draft-1$/);
    expect(init).toMatchObject({ method: "GET", cache: "no-store", headers: { Authorization: "access-token" } });
  });

  it("asks the visitor to log in when there is no host session, without calling the API", async () => {
    Auth.currentSession.mockRejectedValue(new Error("No current user"));

    await expect(fetchWebsitePreviewByDraftId("draft-1")).rejects.toThrow(WEBSITE_PREVIEW_LOGIN_MESSAGE);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks the visitor to log in as the host when the API refuses the session", async () => {
    fetch.mockResolvedValue(jsonResponse(403, { message: "You must be the owner of the property." }));

    await expect(fetchWebsitePreviewByDraftId("draft-1")).rejects.toThrow(WEBSITE_PREVIEW_LOGIN_MESSAGE);
  });

  it("shows the message of the API for a preview that does not exist", async () => {
    fetch.mockResolvedValue(jsonResponse(404, { message: "Website preview not found." }));

    await expect(fetchWebsitePreviewByDraftId("draft-1")).rejects.toThrow("Website preview not found.");
  });

  it("refuses an empty preview id", async () => {
    await expect(fetchWebsitePreviewByDraftId("  ")).rejects.toThrow("Missing website preview id.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
