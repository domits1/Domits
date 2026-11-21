import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import WebsiteTemplatePreview, { WebsiteTemplateSurface } from "../rendering/WebsiteTemplatePreview";

jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub({ siteId }) {
    return <div data-testid="quote-availability" data-site-id={siteId} />;
  },
}));

const ALL_PAGES_ON = Object.freeze({
  gallery: { enabled: true },
  accommodation: { enabled: true },
  contact: { enabled: true },
});

const buildEliteModel = () =>
  applyWebsiteDraftContentOverrides(
    buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot, summaryProperty: null }),
    { ...renderPayload.contentOverrides, sitePages: ALL_PAGES_ON },
    "panorama-landing"
  );

const renderPublicPage = (activePageKey) =>
  render(
    <MemoryRouter>
      <WebsiteTemplateSurface
        templateId="panorama-landing"
        model={buildEliteModel()}
        showBrowserChrome={false}
        enableScrollReveal
        quoteContext={{ siteId: renderPayload.site.id }}
        activePageKey={activePageKey}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-09T10:00:00Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the Elite home page", () => {
  it("renders the public home page as acceptance does", async () => {
    const { container } = renderPublicPage("main");
    await screen.findByTestId("quote-availability");

    expect(container.innerHTML).toMatchSnapshot();
  });

  it("renders the editor preview of the home page as acceptance does", () => {
    const { container } = render(
      <MemoryRouter>
        <WebsiteTemplatePreview
          templateId="panorama-landing"
          model={buildEliteModel()}
          onSelectTarget={jest.fn()}
          activeTargetId=""
          activePageKey="main"
        />
      </MemoryRouter>
    );

    expect(container.innerHTML).toMatchSnapshot();
  });
});
