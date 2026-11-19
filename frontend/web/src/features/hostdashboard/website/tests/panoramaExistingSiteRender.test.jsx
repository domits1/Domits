import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides } from "../rendering/websiteDraftThemeOverrides";
import WebsiteTemplatePreview, { WebsiteTemplateSurface } from "../rendering/WebsiteTemplatePreview";

jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub({ siteId }) {
    return <div data-testid="quote-availability" data-site-id={siteId} />;
  },
}));

const TEMPLATE_KEY = renderPayload.site.templateKey;

const buildExistingSiteModel = () =>
  applyWebsiteDraftContentOverrides(
    applyWebsiteDraftThemeOverrides(
      buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot, summaryProperty: null }),
      renderPayload.themeOverrides
    ),
    renderPayload.contentOverrides,
    TEMPLATE_KEY
  );

const renderPublicSurface = (model, quoteContext = null) =>
  render(
    <MemoryRouter>
      <WebsiteTemplateSurface
        templateId={TEMPLATE_KEY}
        model={model}
        showContactWidget={model.visibility?.chatWidget ?? true}
        showBrowserChrome={false}
        enableScrollReveal
        quoteContext={quoteContext}
      />
    </MemoryRouter>
  );

const renderEditorPreview = (model) =>
  render(
    <MemoryRouter>
      <WebsiteTemplatePreview templateId={TEMPLATE_KEY} model={model} onSelectTarget={jest.fn()} activeTargetId="" />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-09T10:00:00Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Panorama render of an existing site without site pages", () => {
  it("renders the public site as acceptance does", async () => {
    const { container } = renderPublicSurface(buildExistingSiteModel(), { siteId: renderPayload.site.id });
    await screen.findByTestId("quote-availability");

    expect(container.innerHTML).toMatchSnapshot();
  });

  it("renders the public preview as acceptance does", () => {
    const { container } = renderPublicSurface(buildExistingSiteModel());

    expect(container.innerHTML).toMatchSnapshot();
  });

  it("renders the editor preview as acceptance does", () => {
    const { container } = renderEditorPreview(buildExistingSiteModel());

    expect(container.innerHTML).toMatchSnapshot();
  });
});
