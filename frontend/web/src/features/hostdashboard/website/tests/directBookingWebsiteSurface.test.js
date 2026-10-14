import {
  isDirectBookingWebsiteHostName,
  isDirectBookingWebsiteSurfaceForced,
  resolveDirectBookingWebsiteSurface,
} from "../directBookingWebsiteSurface";

const SURFACE_FLAG = "REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE";
const SUFFIX_FLAG = "REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX";

describe("direct booking website surface", () => {
  const originalEnv = { surface: process.env[SURFACE_FLAG], suffix: process.env[SUFFIX_FLAG] };

  beforeEach(() => {
    delete process.env[SURFACE_FLAG];
    delete process.env[SUFFIX_FLAG];
  });

  afterAll(() => {
    if (originalEnv.surface === undefined) delete process.env[SURFACE_FLAG];
    else process.env[SURFACE_FLAG] = originalEnv.surface;
    if (originalEnv.suffix === undefined) delete process.env[SUFFIX_FLAG];
    else process.env[SUFFIX_FLAG] = originalEnv.suffix;
  });

  describe("hostname suffix match", () => {
    it.each([
      ["direct.domits.com", true],
      ["cliff-house-1a2b3c4d.direct.domits.com", true],
      ["Cliff-House.DIRECT.domits.com", true],
      ["cliff-house.direct.domits.com:3000", true],
      ["www.domits.com", false],
      ["acceptance.domits.com", false],
      ["www.theirvilla.com", false],
      ["notdirect.domits.com", false],
      ["", false],
    ])("treats %s as a fallback host: %s", (hostName, expected) => {
      expect(isDirectBookingWebsiteHostName(hostName)).toBe(expected);
    });

    it("honours a configured suffix", () => {
      process.env[SUFFIX_FLAG] = "sites.example.test";
      expect(isDirectBookingWebsiteHostName("villa.sites.example.test")).toBe(true);
      expect(isDirectBookingWebsiteHostName("villa.direct.domits.com")).toBe(false);
    });
  });

  describe("build-time surface flag", () => {
    it("is off unless the flag is exactly true", () => {
      expect(isDirectBookingWebsiteSurfaceForced()).toBe(false);
      process.env[SURFACE_FLAG] = "false";
      expect(isDirectBookingWebsiteSurfaceForced()).toBe(false);
      process.env[SURFACE_FLAG] = "1";
      expect(isDirectBookingWebsiteSurfaceForced()).toBe(false);
      process.env[SURFACE_FLAG] = " TRUE ";
      expect(isDirectBookingWebsiteSurfaceForced()).toBe(true);
    });

    it("renders the site surface on any hostname when the flag is on", () => {
      process.env[SURFACE_FLAG] = "true";
      const surface = resolveDirectBookingWebsiteSurface({ hostname: "www.theirvilla.com", pathname: "/" });
      expect(surface).toEqual({ isHost: true, isPreviewPath: false, isLivePath: false, isSurface: true });
    });

    it("keeps the fallback wildcard working without the flag", () => {
      const fallback = resolveDirectBookingWebsiteSurface({
        hostname: "cliff-house-1a2b3c4d.direct.domits.com",
        pathname: "/",
      });
      expect(fallback.isHost).toBe(true);
      expect(fallback.isSurface).toBe(true);

      const marketplace = resolveDirectBookingWebsiteSurface({ hostname: "www.domits.com", pathname: "/" });
      expect(marketplace).toEqual({ isHost: false, isPreviewPath: false, isLivePath: false, isSurface: false });
    });
  });

  describe("marketplace paths that are also site surfaces", () => {
    it("recognises the preview and live debug routes on the marketplace host", () => {
      expect(
        resolveDirectBookingWebsiteSurface({ hostname: "www.domits.com", pathname: "/website-preview/abc" })
      ).toEqual({
        isHost: false,
        isPreviewPath: true,
        isLivePath: false,
        isSurface: true,
      });
      expect(
        resolveDirectBookingWebsiteSurface({
          hostname: "www.domits.com",
          pathname: "/website-live/x.direct.domits.com",
        })
      ).toEqual({ isHost: false, isPreviewPath: false, isLivePath: true, isSurface: true });
    });
  });
});
