import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import MarketplaceCanonicalLink from "../MarketplaceCanonicalLink";

const canonicalHref = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;

const withHostname = (hostname, run) => {
  const previousLocation = globalThis.location;
  Object.defineProperty(globalThis, "location", {
    value: { ...previousLocation, hostname },
    configurable: true,
    writable: true,
  });
  try {
    return run();
  } finally {
    Object.defineProperty(globalThis, "location", {
      value: previousLocation,
      configurable: true,
      writable: true,
    });
  }
};

const renderAt = (entry, hostname = "www.domits.com") =>
  withHostname(hostname, () =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <MarketplaceCanonicalLink />
      </MemoryRouter>
    )
  );

describe("the canonical link in the document head", () => {
  afterEach(() => {
    document.head.querySelectorAll("link, meta").forEach((element) => element.remove());
  });

  it("writes exactly one canonical link for a public page", () => {
    renderAt("/about");

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(canonicalHref()).toBe("https://www.domits.com/about");
  });

  it("writes no canonical at all on a page that must not be indexed", () => {
    renderAt("/hostdashboard/finance");

    expect(canonicalHref()).toBeNull();
  });

  it("removes the canonical again when the page unmounts", () => {
    const { unmount } = renderAt("/about");
    expect(canonicalHref()).toBe("https://www.domits.com/about");

    unmount();

    expect(canonicalHref()).toBeNull();
  });

  it("keeps the filtered search pages on one canonical", () => {
    renderAt("/home?country=Aruba");

    expect(canonicalHref()).toBe("https://www.domits.com/home");
  });

  it("writes nothing on a direct booking website host", () => {
    renderAt("/", "villa-loiki-8cf98e11.direct.domits.com");

    expect(canonicalHref()).toBeNull();
  });

  it("leaves a robots tag that belongs to someone else alone", () => {
    const foreignRobots = document.createElement("meta");
    foreignRobots.setAttribute("name", "robots");
    foreignRobots.setAttribute("content", "noindex, nofollow");
    document.head.append(foreignRobots);

    const { unmount } = renderAt("/about");
    unmount();

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
  });
});
