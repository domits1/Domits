import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import PanoramaLandingTemplate from "../rendering/templates/PanoramaLandingTemplate";

jest.mock("../../../../components/gallery/PhotoBrowserOverlay", () => ({
  __esModule: true,
  default: function PhotoBrowserOverlayStub({ initialIndex }) {
    return <div data-testid="photo-browser" data-initial-index={initialIndex} />;
  },
}));

const LONG_TITLE = `Villa B ${"by the quiet rice fields of the valley ".repeat(3).trim()}`;

const buildModel = (count) =>
  buildWebsiteTemplateModel({
    propertyDetails: {
      ...renderPayload.propertySnapshot,
      images: Array.from({ length: count }, (_, index) => ({
        ...renderPayload.propertySnapshot.images[0],
        image_id: `image-${index}`,
        sort_order: index,
        web_key: `images/property/image-${index}/web.jpg`,
      })),
    },
    summaryProperty: null,
  });

const renderPhotosPage = (model, title = "Villa B") =>
  render(
    <MemoryRouter>
      <PanoramaLandingTemplate
        model={model}
        sitePropertyPage={{
          kind: "photos",
          pageKey: "gallery",
          title,
          overviewHref: "/",
          propertyHref: "/properties/villa-b",
          photosHref: "/properties/villa-b/photos",
          navItems: [],
          stay: { checkIn: null, checkOut: null, guests: null },
          booking: null,
          buildRequestHref: () => "",
        }}
      />
    </MemoryRouter>
  );

describe("the photos page of an Elite property", () => {
  it("opens under a light header and opens the photo browser at the photo the guest picks", async () => {
    const { container } = renderPhotosPage(buildModel(6));

    expect(container.querySelector("header").dataset.eliteHeader).toBe("light");
    fireEvent.click(container.querySelectorAll("[data-gallery-layout] [role='button']")[5]);

    expect(await screen.findByTestId("photo-browser")).toHaveAttribute("data-initial-index", "5");
  });

  it("lays out a single photo on its own", () => {
    const { container } = renderPhotosPage(buildModel(1));

    expect(container.querySelector("[data-gallery-layout]").dataset.galleryLayout).toBe("single");
    expect(container.querySelectorAll("[data-gallery-layout] img")).toHaveLength(1);
  });

  it("shows a long title in full", () => {
    renderPhotosPage(buildModel(2), LONG_TITLE);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`Photos of ${LONG_TITLE}`);
    expect(screen.getByRole("link", { name: LONG_TITLE })).toHaveAttribute("href", "/properties/villa-b");
    expect(screen.getByRole("link", { name: `Back to ${LONG_TITLE}` })).toBeInTheDocument();
  });
});
