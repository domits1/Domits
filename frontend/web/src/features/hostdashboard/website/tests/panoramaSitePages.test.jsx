import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import PanoramaLandingTemplate from "../rendering/templates/PanoramaLandingTemplate";

jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub({ siteId }) {
    return <div data-testid="quote-availability" data-site-id={siteId} />;
  },
}));

jest.mock("../../../../components/gallery/PhotoBrowserOverlay", () => ({
  __esModule: true,
  default: function PhotoBrowserOverlayStub() {
    return <div data-testid="photo-browser" />;
  },
}));

const ALL_PAGES_ON = Object.freeze({
  gallery: { enabled: true },
  accommodation: { enabled: true, navLabel: "The villa" },
  contact: { enabled: true },
});

const buildModel = (overrides = {}) =>
  applyWebsiteDraftContentOverrides(
    buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot, summaryProperty: null }),
    { ...renderPayload.contentOverrides, ...overrides },
    "panorama-landing"
  );

const templateAt = (model, props = {}) => (
  <MemoryRouter>
    <PanoramaLandingTemplate model={model} quoteContext={{ siteId: "site-1" }} {...props} />
  </MemoryRouter>
);

const renderTemplate = (model, props = {}) => render(templateAt(model, props));

const listSectionIds = (container) =>
  Array.from(container.querySelectorAll("article > section[id]")).map((section) => section.id);

const listPageHeadings = () => screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent);

describe("Panorama with site pages switched on", () => {
  it("keeps the hero, the stay, availability and the quote panel on Main", async () => {
    const { container } = renderTemplate(buildModel({ sitePages: ALL_PAGES_ON }));

    expect(listSectionIds(container)).toEqual(["overview", "lifestyle", "availability"]);
    expect(await screen.findByTestId("quote-availability")).toHaveAttribute("data-site-id", "site-1");
    expect(container.querySelector("[data-panorama-page-header]")).toBeNull();
  });

  it.each([
    ["gallery", "Gallery", ["gallery"]],
    ["accommodation", "The villa", ["about", "features"]],
    ["contact", "Contact us", ["contact"]],
  ])("renders only the %s sections under a page header", (pageKey, title, sectionIds) => {
    const { container } = renderTemplate(buildModel({ sitePages: ALL_PAGES_ON }), { activePageKey: pageKey });

    expect(listSectionIds(container)).toEqual(sectionIds);
    expect(listPageHeadings()).toEqual([title]);
    expect(container.querySelector("[data-panorama-page-header]")).toHaveTextContent(renderPayload.site.siteName);
    expect(screen.queryByTestId("quote-availability")).toBeNull();
  });

  it.each(["contact", "main", "unknown", "constructor", "__proto__", ""])(
    "renders Main with every section whose page is off for the page key %p",
    (pageKey) => {
      const { container } = renderTemplate(buildModel({ sitePages: { gallery: { enabled: true } } }), {
        activePageKey: pageKey,
      });

      expect(listSectionIds(container)).toEqual([
        "overview",
        "about",
        "features",
        "lifestyle",
        "availability",
        "contact",
      ]);
      expect(container.querySelector("[data-panorama-page-header]")).toBeNull();
    }
  );

  it.each([
    ['Rooms & "suites"', 'Rooms & "suites"'],
    ["<img src=x onerror=alert(1)>", "Accommodation"],
  ])("writes the page title %p as text", (navLabel, title) => {
    const { container } = renderTemplate(buildModel({ sitePages: { accommodation: { enabled: true, navLabel } } }), {
      activePageKey: "accommodation",
    });

    const header = container.querySelector("[data-panorama-page-header]");
    expect(listPageHeadings()).toEqual([title]);
    expect(header.querySelectorAll("img")).toHaveLength(0);
  });

  it.each([
    [true, {}],
    [false, { visibility: { topBar: false } }],
  ])("leaves room for the top bar above the page header: %p", (hasTopBar, overrides) => {
    const { container } = renderTemplate(buildModel({ sitePages: ALL_PAGES_ON, ...overrides }), {
      activePageKey: "gallery",
    });

    expect(container.querySelector("[data-panorama-top-bar]") !== null).toBe(hasTopBar);
    expect(
      container.querySelector("[data-panorama-page-header]").classList.contains("panoramaPageHeaderWithTopBar")
    ).toBe(hasTopBar);
  });

  it("turns the top bar solid when the guest scrolls past the page header after a page change", async () => {
    const model = buildModel({ sitePages: ALL_PAGES_ON });
    const { container, rerender } = renderTemplate(model);
    rerender(
      <MemoryRouter>
        <PanoramaLandingTemplate model={model} quoteContext={{ siteId: "site-1" }} activePageKey="gallery" />
      </MemoryRouter>
    );
    const header = container.querySelector("[data-panorama-page-header]");
    header.getBoundingClientRect = () => ({ top: -200, height: 300 });

    fireEvent.scroll(globalThis);

    await waitFor(() =>
      expect(container.querySelector("[data-panorama-top-bar]")).toHaveClass("panoramaTopBarShellSolid")
    );
  });
});

describe("Panorama without site pages", () => {
  const renderHtml = (model, props) => renderTemplate(model, props).container.innerHTML;

  it.each([
    ["no stored pages and a page key", {}, { activePageKey: "gallery", pageBasePath: "/website-live/villa" }],
    ["stored pages that are all off", { sitePages: { gallery: { enabled: false }, contact: {} } }, {}],
    ["stored pages that are not an object", { sitePages: "gallery" }, { activePageKey: "gallery" }],
  ])("renders exactly as today with %s", (_, overrides, props) => {
    expect(renderHtml(buildModel(overrides), props)).toBe(renderHtml(buildModel()));
  });
});

describe("Panorama site page menu", () => {
  const SITE_ORIGIN = "https://villa.example";

  const readMenu = (nav) =>
    Array.from(nav.children).map((item) => [
      item.textContent,
      item.getAttribute("href"),
      item.getAttribute("aria-current"),
    ]);

  const getTopMenu = (container) => container.querySelector(".templateTopBarNav");
  const getDrawerMenu = (container) => container.querySelector(".panoramaTopBarDrawerNav");

  function LocationProbe() {
    const location = useLocation();
    return <output data-testid="location">{`${location.pathname}${location.hash}`}</output>;
  }

  it("lists Home, the pages that are on and Book in both menus on Main", () => {
    const { container } = renderTemplate(buildModel({ sitePages: { ...ALL_PAGES_ON, contact: { enabled: false } } }));
    const expectedMenu = [
      ["Home", "/", "page"],
      ["Gallery", "/gallery", null],
      ["The villa", "/accommodation", null],
      ["Book", "#availability", null],
    ];

    expect(readMenu(getTopMenu(container))).toEqual(expectedMenu);
    expect(readMenu(getDrawerMenu(container))).toEqual(expectedMenu);
  });

  it("marks the current page and sends Book to availability on Main under the base path", () => {
    const { container } = renderTemplate(buildModel({ sitePages: ALL_PAGES_ON }), {
      activePageKey: "contact",
      pageBasePath: "/website-live/villa.example",
    });

    expect(readMenu(getTopMenu(container))).toEqual([
      ["Home", "/website-live/villa.example", null],
      ["Gallery", "/website-live/villa.example/gallery", null],
      ["The villa", "/website-live/villa.example/accommodation", null],
      ["Contact us", "/website-live/villa.example/contact-us", "page"],
      ["Book", "/website-live/villa.example#availability", null],
    ]);
  });

  it.each(["/\\evil.example", "/x\t/evil.example", "/x\n", "https://evil.example/x", '/"><img src=x>'])(
    "keeps every menu link on the site for the base path %p",
    (pageBasePath) => {
      const { container } = renderTemplate(buildModel({ sitePages: ALL_PAGES_ON }), {
        activePageKey: "gallery",
        pageBasePath,
      });

      const hrefs = readMenu(getTopMenu(container)).map(([, href]) => href);
      expect(hrefs).toEqual(["/", "/gallery", "/accommodation", "/contact-us", "/#availability"]);
      expect(hrefs.map((href) => new URL(href, SITE_ORIGIN).origin)).toEqual(hrefs.map(() => SITE_ORIGIN));
    }
  );

  it("leaves Book out when the availability calendar is hidden", () => {
    const { container } = renderTemplate(
      buildModel({ sitePages: ALL_PAGES_ON, visibility: { availabilityCalendar: false } }),
      { activePageKey: "gallery" }
    );

    expect(readMenu(getTopMenu(container)).map(([label]) => label)).toEqual([
      "Home",
      "Gallery",
      "The villa",
      "Contact us",
    ]);
  });

  it.each([
    ['Rooms & "suites"', 'Rooms & "suites"'],
    ["<script>alert(1)</script>", "Gallery"],
  ])("writes the menu label %p as text", (navLabel, label) => {
    const { container } = renderTemplate(buildModel({ sitePages: { gallery: { enabled: true, navLabel } } }));

    const link = within(getTopMenu(container)).getByRole("link", { name: label });
    expect(link.children).toHaveLength(0);
    expect(container.querySelectorAll("script")).toHaveLength(0);
  });

  it("shows the menu as text with the current page in the editor preview", () => {
    const { container } = renderTemplate(buildModel({ sitePages: ALL_PAGES_ON }), {
      activePageKey: "gallery",
      onSelectTarget: jest.fn(),
    });

    expect(getTopMenu(container).querySelectorAll("a")).toHaveLength(0);
    expect(readMenu(getTopMenu(container))).toEqual([
      ["Home", null, null],
      ["Gallery", null, "page"],
      ["The villa", null, null],
      ["Contact us", null, null],
      ["Book", null, null],
    ]);
  });

  it("opens a page through the router and closes the menu drawer", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <PanoramaLandingTemplate model={buildModel({ sitePages: ALL_PAGES_ON })} />
        <LocationProbe />
      </MemoryRouter>
    );
    const menuButton = screen.getByRole("button", { name: "Open section menu" });
    fireEvent.click(menuButton);

    fireEvent.click(within(getDrawerMenu(container)).getByRole("link", { name: "The villa" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/accommodation$/);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("sends Book from a page to availability on Main through the router", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/gallery"]}>
        <PanoramaLandingTemplate model={buildModel({ sitePages: ALL_PAGES_ON })} activePageKey="gallery" />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.click(within(getTopMenu(container)).getByRole("link", { name: "Book" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/#availability$/);
  });

  it("uses plain links when the template is rendered outside a router", () => {
    const { container } = render(
      <PanoramaLandingTemplate model={buildModel({ sitePages: ALL_PAGES_ON })} activePageKey="gallery" />
    );

    expect(readMenu(getTopMenu(container))).toEqual([
      ["Home", "/", null],
      ["Gallery", "/gallery", "page"],
      ["The villa", "/accommodation", null],
      ["Contact us", "/contact-us", null],
      ["Book", "/#availability", null],
    ]);
  });
});

describe("Panorama page changes", () => {
  it("closes the menu drawer, the amenities panel and the gallery browser when the page changes", async () => {
    const model = buildModel({ sitePages: ALL_PAGES_ON });
    const { rerender } = render(templateAt(model, { activePageKey: "accommodation" }));
    const menuButton = screen.getByRole("button", { name: "Open section menu" });
    fireEvent.click(menuButton);
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(templateAt(model, { activePageKey: "gallery" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "Browse" }));
    rerender(templateAt(model, { activePageKey: "accommodation" }));
    rerender(templateAt(model, { activePageKey: "contact" }));
    await act(async () => {});

    expect(screen.queryByTestId("photo-browser")).toBeNull();
  });

  it("opens the gallery browser on the gallery page", async () => {
    render(templateAt(buildModel({ sitePages: ALL_PAGES_ON }), { activePageKey: "gallery" }));

    fireEvent.click(screen.getByRole("button", { name: "Browse" }));

    expect(await screen.findByTestId("photo-browser")).toBeInTheDocument();
  });
});
