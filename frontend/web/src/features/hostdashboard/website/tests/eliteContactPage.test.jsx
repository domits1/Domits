import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsitePublicSitePage from "../WebsitePublicSitePage";
import { WebsiteTemplateSurface } from "../rendering/WebsiteTemplatePreview";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import { buildEliteContactContext } from "../rendering/templates/elite/eliteContactContent";

jest.mock("../services/websitePublicSiteService", () => ({
  ...jest.requireActual("../services/websitePublicSiteService"),
  fetchPublicWebsiteRenderModel: jest.fn(),
}));
jest.mock("../services/websitePropertyService", () => ({
  enrichWebsitePropertyDetails: async (propertySnapshot) => propertySnapshot,
}));
jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub() {
    return null;
  },
}));

const { fetchPublicWebsiteRenderModel } = jest.requireMock("../services/websitePublicSiteService");

const CONTACT_PAGE_ON = Object.freeze({ contact: { enabled: true } });
const PICKER_LABEL = "Which property is it about?";
const OTHER_PROPERTY = Object.freeze({
  propertyId: "property-other",
  slug: "villa-two",
  isMainProperty: false,
  propertySnapshot: { property: { id: "property-other", title: " Villa Two " } },
});
const SERVED_PROPERTIES = Object.freeze([
  { propertyId: renderPayload.site.propertyId, slug: "bisous", isMainProperty: true },
  OTHER_PROPERTY,
  { ...OTHER_PROPERTY, propertyId: "property-same-slug" },
  { propertyId: "property-without-snapshot", slug: "villa-three", isMainProperty: false },
  { ...OTHER_PROPERTY, propertyId: "property-untitled", slug: "villa-four", propertySnapshot: { property: {} } },
]);

const buildContactPageModel = () =>
  applyWebsiteDraftContentOverrides(
    buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot, summaryProperty: null }),
    { ...renderPayload.contentOverrides, sitePages: CONTACT_PAGE_ON },
    "panorama-landing"
  );

const withContactPage = (fields = {}) => ({
  ...renderPayload,
  contentOverrides: { ...renderPayload.contentOverrides, sitePages: CONTACT_PAGE_ON },
  ...fields,
});

const openSitePath = async (path, payload) => {
  fetchPublicWebsiteRenderModel.mockResolvedValue(payload);
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<WebsitePublicSitePage />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByRole("link", { name: "Home" });
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the Contact us page of a site that cannot receive messages", () => {
  it.each([
    ["without the field", {}],
    ["with the text true", { acceptsContactMessages: "true" }],
  ])("shows today's contact content only, %s", async (_label, fields) => {
    await openSitePath("/contact-us", withContactPage(fields));

    expect(screen.getByRole("heading", { level: 1, name: "Contact us" })).toBeInTheDocument();
    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("the Contact us page of a site that accepts messages", () => {
  it("shows the form after today's contact content, with the properties the render served", async () => {
    await openSitePath(
      "/contact-us",
      withContactPage({ acceptsContactMessages: true, siteProperties: SERVED_PROPERTIES })
    );

    const form = document.querySelector("form");
    expect(screen.getByText("Hosted by").compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const options = Array.from(screen.getByLabelText(PICKER_LABEL).options);
    expect(options.map((option) => [option.value, option.textContent])).toEqual([
      ["", "A general question"],
      [renderPayload.site.propertyId, "Wellness Villa Bisous"],
      ["property-other", "Villa Two"],
      ["property-untitled", "villa-four"],
    ]);
  });

  it("shows no form on the home page", async () => {
    await openSitePath("/", withContactPage({ acceptsContactMessages: true }));

    expect(document.querySelector("form")).toBeNull();
  });

  it("shows no form in the editor preview, even with a contact context", () => {
    render(
      <MemoryRouter>
        <WebsiteTemplateSurface
          templateId="panorama-landing"
          model={buildContactPageModel()}
          onSelectTarget={jest.fn()}
          activePageKey="contact"
          contactContext={{ siteId: renderPayload.site.id, properties: [] }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Hosted by")).toBeInTheDocument();
    expect(document.querySelector("form")).toBeNull();
  });
});

describe("the contact context of a render answer", () => {
  it.each([
    ["the site id of the render", { acceptsContactMessages: true }, { siteId: renderPayload.site.id, properties: [] }],
    ["nothing without the field", { acceptsContactMessages: undefined }, null],
    ["nothing without a site id", { acceptsContactMessages: true, site: { ...renderPayload.site, id: " " } }, null],
  ])("gives %s", (_label, fields, expected) => {
    expect(buildEliteContactContext({ ...renderPayload, ...fields })).toEqual(expected);
  });
});
