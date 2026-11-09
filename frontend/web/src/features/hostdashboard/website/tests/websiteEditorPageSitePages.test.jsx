import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsiteEditorPage from "../WebsiteEditorPage";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "../services/websiteDraftService";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import { fetchWebsitePropertyDetails } from "../services/websitePropertyService";
import { WEBSITE_ENTITLEMENT_UNLIMITED_PAGES, getWebsiteEntitlements } from "../services/websitePlanService";

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/websiteDraftService", () => ({
  ...jest.requireActual("../services/websiteDraftService"),
  fetchWebsiteDraftByPropertyId: jest.fn(),
  upsertWebsiteDraft: jest.fn(),
}));
jest.mock("../services/websiteSiteService", () => ({
  ...jest.requireActual("../services/websiteSiteService"),
  fetchWebsiteSiteByPropertyId: jest.fn(),
  publishWebsiteSite: jest.fn(),
}));
jest.mock("../services/websitePropertyService", () => ({
  ...jest.requireActual("../services/websitePropertyService"),
  fetchWebsitePropertyDetails: jest.fn(),
}));
jest.mock("../services/websiteLiveSiteState", () => ({
  ...jest.requireActual("../services/websiteLiveSiteState"),
  reloadListingDetailsAfterPublish: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("../services/websitePlanService", () => ({
  ...jest.requireActual("../services/websitePlanService"),
  getWebsiteEntitlements: jest.fn(),
}));
jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub() {
    return <div data-testid="quote-availability" />;
  },
}));

const PROPERTY_ID = renderPayload.site.propertyId;
const ESSENTIALS = ["website.basic", "website.booking"];
const STORED_SITE_PAGES = {
  contact: { navLabel: "Contact us", enabled: false },
  gallery: { navLabel: "Photos", enabled: true },
};

const NON_ELITE_READS = [
  ["an Essentials plan", () => Promise.resolve(ESSENTIALS)],
  ["a failed plan read", () => Promise.reject(new Error("Website entitlements request failed (500)."))],
  ["a plan read that never answers", () => new Promise(() => {})],
];

const buildDraft = (contentOverrides, publishedContentOverrides = contentOverrides) => ({
  id: "draft-1",
  propertyId: PROPERTY_ID,
  templateKey: renderPayload.site.templateKey,
  status: "DRAFT",
  contentOverrides,
  themeOverrides: renderPayload.themeOverrides,
  publishedContentOverrides,
  publishedThemeOverrides: renderPayload.themeOverrides,
});

const previewPanel = () => screen.getByRole("heading", { name: "Website preview" }).closest("section");

const renderEditor = async (draft, readEntitlements) => {
  fetchWebsiteDraftByPropertyId.mockResolvedValue(draft);
  getWebsiteEntitlements.mockImplementation(readEntitlements);
  render(
    <MemoryRouter initialEntries={[`/editor/${PROPERTY_ID}`]}>
      <Routes>
        <Route path="/editor/:propertyId" element={<WebsiteEditorPage />} />
      </Routes>
    </MemoryRouter>
  );
  await waitFor(() => expect(previewPanel().querySelector("[data-preview-target-id]")).not.toBeNull());
  await act(async () => {});
};

const saveAfterTitleEdit = async () => {
  fireEvent.change(screen.getByLabelText("Hero title"), { target: { value: "A quiet villa" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(upsertWebsiteDraft).toHaveBeenCalledTimes(1));
  return upsertWebsiteDraft.mock.calls[0][0];
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(globalThis, "scrollBy").mockImplementation(() => {});
  fetchWebsitePropertyDetails.mockResolvedValue(renderPayload.propertySnapshot);
  fetchWebsiteSiteByPropertyId.mockResolvedValue(null);
  upsertWebsiteDraft.mockImplementation((payload) =>
    Promise.resolve({ ...buildDraft(payload.contentOverrides, payload.publishedContentOverrides), ...payload })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each(NON_ELITE_READS)("website editor for a host with %s", (_name, readEntitlements) => {
  it("shows the stored site pages nowhere in the preview", async () => {
    await renderEditor(buildDraft({ ...renderPayload.contentOverrides, sitePages: STORED_SITE_PAGES }), readEntitlements);

    const preview = within(previewPanel());
    expect(preview.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(preview.queryAllByText("Photos")).toHaveLength(0);
    expect(previewPanel().querySelector("[data-panorama-page-header]")).toBeNull();
  });

  it("saves the stored site pages as they are and adds none", async () => {
    await renderEditor(buildDraft({ ...renderPayload.contentOverrides, sitePages: STORED_SITE_PAGES }), readEntitlements);

    const payload = await saveAfterTitleEdit();

    expect(JSON.stringify(payload.contentOverrides)).toBe(
      JSON.stringify({ sitePages: STORED_SITE_PAGES, ...renderPayload.contentOverrides, heroTitle: "A quiet villa" })
    );
    expect(payload.publishedContentOverrides).toEqual({ ...renderPayload.contentOverrides, sitePages: STORED_SITE_PAGES });
  });

  it("saves a draft without site pages without adding them", async () => {
    await renderEditor(buildDraft(renderPayload.contentOverrides), readEntitlements);

    const payload = await saveAfterTitleEdit();

    expect(JSON.stringify(payload.contentOverrides)).toBe(
      JSON.stringify({ ...renderPayload.contentOverrides, heroTitle: "A quiet villa" })
    );
  });

  it("writes nothing while it loads", async () => {
    await renderEditor(buildDraft(renderPayload.contentOverrides), readEntitlements);

    expect(getWebsiteEntitlements).toHaveBeenCalledTimes(1);
    expect(upsertWebsiteDraft).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});

describe("website editor preview for an Elite host", () => {
  it("shows the stored site pages", async () => {
    await renderEditor(buildDraft({ ...renderPayload.contentOverrides, sitePages: STORED_SITE_PAGES }), () =>
      Promise.resolve([...ESSENTIALS, WEBSITE_ENTITLEMENT_UNLIMITED_PAGES])
    );

    const preview = within(previewPanel());
    await waitFor(() => expect(preview.getAllByText("Photos").length).toBeGreaterThan(0));
    expect(preview.queryAllByText("Overview")).toHaveLength(0);
  });
});
