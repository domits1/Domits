import {
  MARKETPLACE_CANONICAL_ORIGIN,
  isMarketplaceCanonicalHost,
  resolveMarketplaceCanonicalPath,
  resolveMarketplaceCanonicalUrl,
} from "../marketplaceCanonical";

const onWww = (pathname, search = "") =>
  resolveMarketplaceCanonicalUrl({ hostname: "www.domits.com", pathname, search });

describe("which hosts get a marketplace canonical", () => {
  it("covers the production, apex, acceptance and amplify hostnames", () => {
    ["www.domits.com", "domits.com", "acceptance.domits.com", "main.d34jwd0sihmsus.amplifyapp.com"].forEach((host) => {
      expect(isMarketplaceCanonicalHost(host)).toBe(true);
    });
  });

  it("points acceptance and the amplify copy at www, so they stop competing with production", () => {
    expect(resolveMarketplaceCanonicalUrl({ hostname: "acceptance.domits.com", pathname: "/about" })).toBe(
      "https://www.domits.com/about"
    );
    expect(
      resolveMarketplaceCanonicalUrl({ hostname: "main.d34jwd0sihmsus.amplifyapp.com", pathname: "/home" })
    ).toBe("https://www.domits.com/home");
  });

  it("never claims a host that is not the marketplace", () => {
    [
      "villa-loiki-8cf98e11.direct.domits.com",
      "direct.domits.com",
      "theirvilla.com",
      "www.theirvilla.com",
      "localhost",
      "127.0.0.1",
      "",
      "domits.com.evil.example",
    ].forEach((host) => {
      expect(isMarketplaceCanonicalHost(host)).toBe(false);
      expect(resolveMarketplaceCanonicalUrl({ hostname: host, pathname: "/about" })).toBe("");
    });
  });

  it("ignores the port and the letter case of the hostname", () => {
    expect(isMarketplaceCanonicalHost("WWW.DOMITS.COM:443")).toBe(true);
  });
});

describe("the canonical path per route", () => {
  it("uses the clean path for the public content pages", () => {
    expect(onWww("/")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/`);
    expect(onWww("/about")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/about`);
    expect(onWww("/why-domits")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/why-domits`);
    expect(onWww("/Sustainability")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/Sustainability`);
    expect(onWww("/job/42")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/job/42`);
  });

  it("drops a trailing slash, because the rewrite serves the clean path", () => {
    expect(onWww("/about/")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/about`);
    expect(onWww("/home//")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/home`);
    expect(onWww("/")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/`);
  });

  it("points every filtered search variant at one page", () => {
    ["?country=Aruba", "?country=Bonaire&type=Boat", "?guests=2&country=Curacao", "?utm_source=newsletter"].forEach(
      (search) => {
        expect(onWww("/home", search)).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/home`);
      }
    );
    expect(onWww("/home/", "?country=Aruba")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/home`);
  });

  it("keeps the ID on a listing, because that is what identifies the page", () => {
    expect(onWww("/listingdetails", "?ID=813f48b3-ea5a-44cf-bef7-0f6af09d2133")).toBe(
      `${MARKETPLACE_CANONICAL_ORIGIN}/listingdetails?ID=813f48b3-ea5a-44cf-bef7-0f6af09d2133`
    );
    expect(onWww("/listingdetails/", "?ID=abc")).toBe(`${MARKETPLACE_CANONICAL_ORIGIN}/listingdetails?ID=abc`);
  });

  it("drops every other parameter from a listing URL", () => {
    expect(onWww("/listingdetails", "?utm_source=mail&ID=abc&guests=2")).toBe(
      `${MARKETPLACE_CANONICAL_ORIGIN}/listingdetails?ID=abc`
    );
  });

  it("claims nothing for a listing URL without an ID", () => {
    expect(onWww("/listingdetails")).toBe("");
    expect(onWww("/listingdetails", "?id=lowercase")).toBe("");
  });

  it("claims nothing for pages that should not be indexed", () => {
    [
      "/login",
      "/register",
      "/confirm-email",
      "/bookingoverview",
      "/bookingsend",
      "/bookingconfirmationoverview",
      "/validatepayment",
      "/verify/phonenumber",
      "/stripe/callback",
      "/team/accept",
      "/admin/property",
      "/employeechat",
      "/review",
      "/channelmanager",
      "/landing",
      "/hostdashboard",
      "/hostdashboard/finance",
      "/guestdashboard/messages",
      "/hostonboarding/step-1",
    ].forEach((pathname) => {
      expect(onWww(pathname)).toBe("");
    });
  });

  it("claims nothing for a path the router does not know", () => {
    ["/does-not-exist", "/home/aruba", "/terms/extra", "/job", "/ABOUT", "/about.php", ""].forEach((pathname) => {
      expect(onWww(pathname)).toBe("");
    });
  });
});

describe("keeping the canonical away from the direct booking websites", () => {
  it("claims nothing on a host site hostname", () => {
    expect(
      resolveMarketplaceCanonicalUrl({ hostname: "villa-loiki-8cf98e11.direct.domits.com", pathname: "/" })
    ).toBe("");
  });

  it("claims nothing on the website surfaces of the marketplace itself", () => {
    expect(onWww("/website-live")).toBe("");
    expect(onWww("/website-live/villa-loiki-8cf98e11.direct.domits.com")).toBe("");
    expect(onWww("/website-preview/abc-123")).toBe("");
  });

  it("claims nothing when the build is the direct booking sites bundle", () => {
    const previousSurface = process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE;
    process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE = "true";

    try {
      expect(resolveMarketplaceCanonicalUrl({ hostname: "www.domits.com", pathname: "/about" })).toBe("");
      expect(resolveMarketplaceCanonicalUrl({ hostname: "theirvilla.com", pathname: "/" })).toBe("");
    } finally {
      process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE = previousSurface;
    }
  });
});

describe("the path helper on its own", () => {
  it("returns a path without an origin, so the origin cannot be forgotten", () => {
    expect(resolveMarketplaceCanonicalPath("/about")).toBe("/about");
    expect(resolveMarketplaceCanonicalPath("/home", "?country=Aruba")).toBe("/home");
    expect(resolveMarketplaceCanonicalPath("not-a-path")).toBe("");
  });
});
