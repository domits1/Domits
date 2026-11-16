import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import PanoramaLandingTemplate from "../rendering/templates/PanoramaLandingTemplate";
import WebsiteTemplatePreview from "../rendering/WebsiteTemplatePreview";

jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub() {
    return <div data-testid="quote-availability" />;
  },
}));

jest.mock("../../../../components/gallery/PhotoBrowserOverlay", () => ({
  __esModule: true,
  default: function PhotoBrowserOverlayStub({ initialIndex }) {
    return <div data-testid="photo-browser" data-initial-index={initialIndex} />;
  },
}));

const PAGES_ON = Object.freeze({ gallery: { enabled: true }, contact: { enabled: true } });
const SNAPSHOT_IMAGES = renderPayload.propertySnapshot.images;

const withImageCount = (count) =>
  Array.from({ length: count }, (_, index) => ({
    ...SNAPSHOT_IMAGES[0],
    image_id: `image-${index}`,
    sort_order: index,
    web_key: `images/property/image-${index}/web.jpg`,
  }));

const buildModel = ({ images = SNAPSHOT_IMAGES, overrides = {} } = {}) =>
  applyWebsiteDraftContentOverrides(
    buildWebsiteTemplateModel({
      propertyDetails: { ...renderPayload.propertySnapshot, images },
      summaryProperty: null,
    }),
    { sitePages: PAGES_ON, ...overrides },
    "panorama-landing"
  );

const renderPage = (pageKey, model = buildModel()) =>
  render(
    <MemoryRouter>
      <PanoramaLandingTemplate model={model} activePageKey={pageKey} />
    </MemoryRouter>
  );

const elitePage = (container, pageKey) => container.querySelector(`[data-elite-page="${pageKey}"]`);
const galleryLayout = (container) => container.querySelector("[data-gallery-layout]")?.dataset.galleryLayout ?? "none";

describe("the Elite gallery page", () => {
  it("opens with a light header and ends with the call to availability", () => {
    const { container } = renderPage("gallery");
    const page = elitePage(container, "gallery");

    expect(page.querySelector("header").dataset.eliteHeader).toBe("light");
    expect(page.querySelector("header img")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gallery");
    expect(container.querySelector("[data-panorama-top-bar]")).toHaveClass("panoramaTopBarShellEliteLight");
    expect(screen.getByRole("heading", { level: 2, name: buildModel().calendarSection.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Check live availability" })).toHaveAttribute("href", "/#availability");
    expect(page.textContent).not.toContain("A more editorial presentation of the property");
  });

  it("shows the gallery line the host wrote under the title", () => {
    const { container } = renderPage(
      "gallery",
      buildModel({ overrides: { galleryDescription: "Sunset over the pool." } })
    );

    expect(elitePage(container, "gallery").querySelector("header")).toHaveTextContent("Sunset over the pool.");
  });

  it.each([
    [0, "none"],
    [1, "single"],
    [2, "pair"],
    [3, "trio"],
    [6, "mosaic"],
    [9, "mosaic"],
  ])("lays out %p photos as %p", (count, layout) => {
    const { container } = renderPage("gallery", buildModel({ images: withImageCount(count) }));

    expect(galleryLayout(container)).toBe(layout);
    expect(container.querySelectorAll("[data-gallery-layout] img").length).toBe(Math.min(count, 6));
  });

  it("leaves out Browse and the placeholder when the listing has no photos", () => {
    renderPage("gallery", buildModel({ images: [] }));

    expect(screen.queryByRole("button", { name: "Browse" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Photos" })).toBeNull();
  });

  it("opens the photo browser at the photo the guest picks", async () => {
    const { container } = renderPage("gallery", buildModel({ images: withImageCount(4) }));

    fireEvent.click(container.querySelectorAll("[data-gallery-layout] [role='button']")[2]);

    expect(await screen.findByTestId("photo-browser")).toHaveAttribute("data-initial-index", "2");
  });

  it("drops the photos and the closing call when the host hid them", () => {
    const model = buildModel({ overrides: { visibility: { gallerySection: false, availabilityCalendar: false } } });
    const { container } = renderPage("gallery", model);

    expect(screen.queryByRole("region", { name: "Photos" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Check live availability" })).toBeNull();
    expect(elitePage(container, "gallery").querySelector("footer")).toHaveTextContent(renderPayload.site.siteName);
  });
});

describe("the Elite contact page", () => {
  it("shows the contact copy and the host in the new style under a photo header", () => {
    const { container } = renderPage("contact");
    const page = elitePage(container, "contact");

    expect(page.querySelector("header").dataset.eliteHeader).toBe("photo");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Contact us");
    expect(screen.getByRole("heading", { level: 2, name: "Plan the stay with the host" })).toBeInTheDocument();
    expect(within(page).getByText("Hosted by")).toBeInTheDocument();
    expect(page.querySelector("#contact")).toBeNull();
    expect(screen.getByRole("link", { name: "Check live availability" })).toBeInTheDocument();
  });

  it("drops the contact block when the host hid it", () => {
    renderPage("contact", buildModel({ overrides: { visibility: { contactSection: false } } }));

    expect(screen.queryByText("Hosted by")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Contact us");
  });
});

describe("the Elite gallery and contact pages in the editor preview", () => {
  const renderPreview = (pageKey, onSelectTarget) =>
    render(
      <WebsiteTemplatePreview
        templateId="panorama-landing"
        model={buildModel({ images: withImageCount(3) })}
        onSelectTarget={onSelectTarget}
        activePageKey={pageKey}
      />
    );

  it("lets the host pick a gallery photo and shows the closing call without a link", () => {
    const onSelectTarget = jest.fn();
    const { container } = renderPreview("gallery", onSelectTarget);

    fireEvent.click(container.querySelectorAll("[data-gallery-layout] [role='button']")[1]);

    expect(onSelectTarget).toHaveBeenCalledWith(expect.objectContaining({ sectionId: "gallery" }));
    expect(screen.queryByRole("link", { name: "Check live availability" })).toBeNull();
  });

  it("lets the host pick the contact caption", () => {
    const onSelectTarget = jest.fn();
    renderPreview("contact", onSelectTarget);

    fireEvent.click(screen.getByText("Plan the stay with the host"));

    expect(onSelectTarget).toHaveBeenCalledWith({ sectionId: "contact", targetId: "contact.caption" });
  });
});
