import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
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

const ACCOMMODATION_ON = Object.freeze({ accommodation: { enabled: true, navLabel: "The villa" } });
const LONG_SENTENCE = `The terrace ${"looks over the rice fields and the river ".repeat(7).trim()}.`;

const buildSnapshot = (changes = {}) => ({
  ...renderPayload.propertySnapshot,
  property: { ...renderPayload.propertySnapshot.property, ...changes.property },
  checkIn: { checkIn: { from: "15:00:00" }, checkOut: { till: "11:00:00" } },
  pricing: { ...renderPayload.propertySnapshot.pricing, roomRate: 2733 },
  rules: [
    { rule: "SmokingAllowed", value: false },
    { rule: "PetsAllowed", value: false },
    { rule: "CancellationPolicy:Strict", value: true },
    { rule: "QuietHours", value: true },
  ],
  ...changes.snapshot,
});

const buildModel = ({ snapshot = buildSnapshot(), overrides = {} } = {}) =>
  applyWebsiteDraftContentOverrides(
    buildWebsiteTemplateModel({ propertyDetails: snapshot, summaryProperty: null }),
    { sitePages: ACCOMMODATION_ON, ...overrides },
    "panorama-landing"
  );

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.hash}`}</output>;
}

const renderPage = (model = buildModel(), props = {}) =>
  render(
    <MemoryRouter initialEntries={["/accommodation"]}>
      <PanoramaLandingTemplate model={model} activePageKey="accommodation" {...props} />
      <LocationProbe />
    </MemoryRouter>
  );

const elitePage = (container) => container.querySelector('[data-elite-page="accommodation"]');
const topBar = (container) => container.querySelector("[data-panorama-top-bar]");

describe("the Elite accommodation page", () => {
  it("shows the facts, the price and the times the way the design reads", () => {
    const { container } = renderPage();
    const page = elitePage(container);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The villa");
    expect(within(page).getByText("Ubud, Indonesia", { selector: "header p" })).toBeInTheDocument();
    expect(within(page).getByText("Up to 8")).toBeInTheDocument();
    expect(within(page).getByText("15:00 · 11:00")).toBeInTheDocument();
    expect(within(page).getByText("2 nights")).toBeInTheDocument();
    expect(within(page).getByText("€2,733")).toBeInTheDocument();
    expect(within(page).getByText("per night")).toBeInTheDocument();
    expect(page.textContent).not.toMatch(/15:00:00|EUR|Designed to present the stay/);
    expect(page.querySelector("header").dataset.eliteHeader).toBe("photo");
    expect(topBar(container)).toHaveClass("panoramaTopBarShellElite");
    expect(topBar(container)).not.toHaveClass("panoramaTopBarShellEliteLight");
  });

  it.each([
    ["", "/#availability"],
    ["/website-live/villa.example", "/website-live/villa.example#availability"],
  ])("sends the guest from the price card to availability on the home page under %p", (pageBasePath, target) => {
    renderPage(buildModel(), { pageBasePath });

    fireEvent.click(screen.getByRole("link", { name: "Check live availability" }));

    expect(screen.getByTestId("location").textContent).toBe(target);
  });

  it("lists the highlights", () => {
    const { container } = renderPage();

    expect(Array.from(elitePage(container).querySelector("ul").children).map((item) => item.textContent)).toEqual(
      buildModel().amenities.all.map((amenity) => amenity.label)
    );
  });

  it("shows only the site name and the location in the footer", () => {
    const { container } = renderPage();
    const footer = elitePage(container).querySelector("footer");

    expect(Array.from(footer.querySelectorAll("span")).map((span) => span.textContent)).toEqual([
      renderPayload.site.siteName,
      "Ubud, Indonesia",
    ]);
  });

  it("lists every house rule with its own icon", () => {
    renderPage();
    const rules = within(screen.getByRole("region", { name: "House rules" })).getAllByRole("listitem");

    expect(rules.map((rule) => [rule.textContent, rule.dataset.houseRule])).toEqual([
      ["No smoking", "SmokingAllowed"],
      ["No pets", "PetsAllowed"],
      ["Limited (Cancel up to 14 days before)", "CancellationPolicy:Strict"],
      ["Quiet Hours", "other"],
    ]);
    expect(rules.every((rule) => rule.querySelector("svg[aria-hidden='true']"))).toBe(true);
  });

  it("shows two photos that are not the header photo", () => {
    const images = renderPayload.propertySnapshot.images;
    const thirdImage = { ...images[1], image_id: "third", sort_order: 2, web_key: "images/property/third/web.jpg" };
    const { container } = renderPage(
      buildModel({ snapshot: buildSnapshot({ snapshot: { images: [...images, thirdImage] } }) })
    );
    const photos = elitePage(container).querySelector("[data-photo-count]");

    expect(photos.dataset.photoCount).toBe("2");
    expect(Array.from(photos.querySelectorAll("img")).map((image) => image.alt)).toEqual([
      "Wellness Villa Bisous residence view",
      "Wellness Villa Bisous view 3",
    ]);
  });

  it("opens and closes the rest of a long description", () => {
    const description = ["A quiet villa.", LONG_SENTENCE, LONG_SENTENCE, LONG_SENTENCE].join(" ");
    renderPage(buildModel({ snapshot: buildSnapshot({ property: { description } }) }));
    const toggle = screen.getByRole("button", { name: "Read more" });
    const more = document.getElementById(toggle.getAttribute("aria-controls"));

    expect(more).not.toBeVisible();
    fireEvent.click(toggle);
    expect(more).toBeVisible();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Read less");
  });

  it("opens the full amenities panel from the highlights", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Show all" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("the Elite accommodation page with little data", () => {
  it("leaves out the facts, description, highlights, house rules and photos the listing does not have", () => {
    const snapshot = buildSnapshot({
      property: { description: "" },
      snapshot: {
        amenities: [],
        rules: [],
        images: [],
        generalDetails: [],
        availabilityRestrictions: [],
        checkIn: { checkIn: {}, checkOut: {} },
      },
    });
    const { container } = renderPage(buildModel({ snapshot }));
    const page = elitePage(container);

    expect(page.querySelector("[data-preview-target-id='residence.description']")).toBeNull();
    expect(page.textContent).not.toContain("Ubud, Indonesia for");
    expect(screen.queryByRole("region", { name: "Facts" })).toBeNull();
    expect(screen.queryByRole("region", { name: "House rules" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Read more" })).toBeNull();
    expect(page.querySelector("[data-photo-count]")).toBeNull();
    expect(page.querySelector("header img")).toBeNull();
    expect(page.querySelector("header").dataset.eliteHeader).toBe("light");
    expect(topBar(container)).toHaveClass("panoramaTopBarShellElite", "panoramaTopBarShellEliteLight");
    expect(screen.queryByText("Show all")).toBeNull();
  });

  it("leaves out the price card when there is no price and availability is hidden", () => {
    const snapshot = buildSnapshot({ snapshot: { pricing: { roomRate: 0 } } });
    renderPage(buildModel({ snapshot, overrides: { visibility: { availabilityCalendar: false } } }));

    expect(screen.queryByRole("complementary", { name: "Price and availability" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Check live availability" })).toBeNull();
  });

  it("keeps the price without a button when availability is hidden", () => {
    renderPage(buildModel({ overrides: { visibility: { availabilityCalendar: false } } }));
    const priceCard = screen.getByRole("complementary", { name: "Price and availability" });

    expect(priceCard).toHaveTextContent("€2,733per night");
    expect(within(priceCard).queryByRole("link")).toBeNull();
  });
});

describe("where the Elite accommodation page does not appear", () => {
  it.each([
    ["no stored pages", {}],
    ["the accommodation page switched off", { sitePages: { accommodation: { enabled: false } } }],
  ])("renders no Elite page with %s", (_, overrides) => {
    const model = applyWebsiteDraftContentOverrides(
      buildWebsiteTemplateModel({ propertyDetails: buildSnapshot(), summaryProperty: null }),
      overrides,
      "panorama-landing"
    );
    const { container } = renderPage(model);

    expect(container.querySelector("[data-elite-page]")).toBeNull();
    expect(topBar(container)).not.toHaveClass("panoramaTopBarShellElite");
  });

  it("leaves the home page of an Elite site without the Elite style", () => {
    const { container } = renderPage(buildModel(), { activePageKey: "main" });

    expect(container.querySelector("[data-elite-page]")).toBeNull();
    expect(topBar(container)).not.toHaveClass("panoramaTopBarShellElite");
  });
});

describe("the Elite accommodation page in the editor preview", () => {
  it("shows the button without a link and lets the host pick the description", () => {
    const onSelectTarget = jest.fn();
    render(
      <WebsiteTemplatePreview
        templateId="panorama-landing"
        model={buildModel()}
        onSelectTarget={onSelectTarget}
        activePageKey="accommodation"
      />
    );

    expect(screen.queryByRole("link", { name: "Check live availability" })).toBeNull();
    expect(screen.getByText("Check live availability").tagName).toBe("SPAN");

    fireEvent.click(screen.getByText(renderPayload.propertySnapshot.property.description));

    expect(onSelectTarget).toHaveBeenCalledWith({ sectionId: "residence", targetId: "residence.description" });
  });
});
