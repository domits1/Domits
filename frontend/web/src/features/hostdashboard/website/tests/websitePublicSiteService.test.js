import {
  isMissingPublishedWebsiteError,
  PublicWebsiteRequestError,
} from "../services/websitePublicSiteService";

describe("isMissingPublishedWebsiteError", () => {
  it("recognises a website that the api says does not exist", () => {
    expect(isMissingPublishedWebsiteError(new PublicWebsiteRequestError("Published website not found.", 404))).toBe(
      true
    );
    expect(isMissingPublishedWebsiteError(new PublicWebsiteRequestError("Gone.", 410))).toBe(true);
  });

  it("does not treat a server or client failure as a missing website", () => {
    expect(isMissingPublishedWebsiteError(new PublicWebsiteRequestError("Server error.", 500))).toBe(false);
    expect(isMissingPublishedWebsiteError(new PublicWebsiteRequestError("Bad request.", 400))).toBe(false);
    expect(isMissingPublishedWebsiteError(new PublicWebsiteRequestError("Forbidden.", 403))).toBe(false);
  });

  it("does not treat an unrelated failure as a missing website", () => {
    expect(isMissingPublishedWebsiteError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isMissingPublishedWebsiteError(new Error("Enrichment failed."))).toBe(false);
    expect(isMissingPublishedWebsiteError(null)).toBe(false);
    expect(isMissingPublishedWebsiteError(undefined)).toBe(false);
  });

  it("does not depend on prototype identity to recognise the error", () => {
    const structurallyEqualError = Object.assign(new Error("Published website not found."), {
      name: "PublicWebsiteRequestError",
      status: 404,
    });

    expect(structurallyEqualError instanceof PublicWebsiteRequestError).toBe(false);
    expect(isMissingPublishedWebsiteError(structurallyEqualError)).toBe(true);
  });

  it("keeps the http status on the error", () => {
    expect(new PublicWebsiteRequestError("Published website not found.", 404).status).toBe(404);
    expect(new PublicWebsiteRequestError("Missing status.").status).toBe(0);
  });
});
