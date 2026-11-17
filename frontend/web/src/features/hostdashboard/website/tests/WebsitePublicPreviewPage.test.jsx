import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WebsitePublicPreviewPage from "../WebsitePublicPreviewPage.jsx";
import { fetchWebsitePreviewByDraftId } from "../services/websitePublicPreviewService";
import { enrichWebsitePropertyDetails } from "../services/websitePropertyService";

jest.mock("../services/websitePublicPreviewService", () => ({
  ...jest.requireActual("../services/websitePublicPreviewService"),
  fetchWebsitePreviewByDraftId: jest.fn(),
}));
jest.mock("../services/websitePropertyService", () => ({ enrichWebsitePropertyDetails: jest.fn() }));
jest.mock("../services/websitePreviewSync", () => ({ subscribeToWebsitePreviewUpdates: () => () => undefined }));
jest.mock("../analytics/websiteAnalyticsService", () => ({ recordPublicWebsiteAnalyticsEventSafely: jest.fn() }));
jest.mock("../analytics/websitePreviewAnalytics", () => ({
  getWebsiteAnalyticsViewport: () => "desktop",
  startWebsitePreviewLcpObserver: () => () => undefined,
}));
jest.mock("../rendering/templateRegistry", () => ({ getWebsiteTemplateRenderer: () => () => null }));
jest.mock("../rendering/WebsiteTemplatePreview", () => ({
  WebsiteTemplateSurface: () => <div>template surface</div>,
}));

const HOST = { displayName: "Karim", profileImage: "", whatsapp: { isAvailable: false } };
const PREVIEW = {
  draft: { id: "draft-1", templateKey: "panorama-landing", contentOverrides: {}, themeOverrides: {} },
  propertyDetails: { property: { id: "property-1", title: "Cliff House" } },
  host: HOST,
};

const renderPreview = () =>
  render(
    <MemoryRouter initialEntries={["/website-preview/draft-1"]}>
      <Routes>
        <Route path="/website-preview/:draftId" element={<WebsitePublicPreviewPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("WebsitePublicPreviewPage", () => {
  beforeEach(() => {
    fetchWebsitePreviewByDraftId.mockReset();
    enrichWebsitePropertyDetails.mockReset();
  });

  it("builds the host block from the preview answer, the same way as the live site", async () => {
    fetchWebsitePreviewByDraftId.mockResolvedValue(PREVIEW);
    enrichWebsitePropertyDetails.mockImplementation(async (details) => details);

    renderPreview();

    await waitFor(() => expect(enrichWebsitePropertyDetails).toHaveBeenCalled());
    expect(fetchWebsitePreviewByDraftId).toHaveBeenCalledWith("draft-1");
    expect(enrichWebsitePropertyDetails).toHaveBeenCalledWith(PREVIEW.propertyDetails, null, { host: HOST });
    expect(await screen.findByText("template surface")).toBeInTheDocument();
  });

  it("shows why the preview cannot be opened", async () => {
    fetchWebsitePreviewByDraftId.mockRejectedValue(new Error("Log in as the host of this website to see its preview."));

    renderPreview();

    expect(await screen.findByText("Log in as the host of this website to see its preview.")).toBeInTheDocument();
    expect(enrichWebsitePropertyDetails).not.toHaveBeenCalled();
  });
});
