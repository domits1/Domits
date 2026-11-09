import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

const renderTemplate = (model, props = {}) =>
  render(
    <MemoryRouter>
      <PanoramaLandingTemplate model={model} quoteContext={{ siteId: "site-1" }} {...props} />
    </MemoryRouter>
  );

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
