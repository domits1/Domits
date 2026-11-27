import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsiteEditorPage from "../WebsiteEditorPage";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "../services/websiteDraftService";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import { fetchWebsitePropertyDetails } from "../services/websitePropertyService";
import { getWebsiteEntitlements } from "../services/websitePlanService";
import { fetchHostPropertySelectOptions } from "../../services/hostTaskPropertyService";

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/websiteDraftService", () => ({
  ...jest.requireActual("../services/websiteDraftService"),
  fetchWebsiteDraftByPropertyId: jest.fn(),
  upsertWebsiteDraft: jest.fn(),
}));
jest.mock("../services/websiteSiteService", () => ({
  ...jest.requireActual("../services/websiteSiteService"),
  fetchWebsiteSiteByPropertyId: jest.fn(),
}));
jest.mock("../services/websitePropertyService", () => ({
  ...jest.requireActual("../services/websitePropertyService"),
  fetchWebsitePropertyDetails: jest.fn(),
}));
jest.mock("../services/websitePlanService", () => ({
  ...jest.requireActual("../services/websitePlanService"),
  getWebsiteEntitlements: jest.fn(),
}));
jest.mock("../../services/hostTaskPropertyService", () => ({
  fetchHostPropertySelectOptions: jest.fn(),
}));
jest.mock("../rendering/WebsiteTemplatePreview", () => ({
  __esModule: true,
  default: function WebsiteTemplatePreviewStub() {
    return <output data-testid="editor-preview" />;
  },
}));

const PROPERTY_ID = renderPayload.site.propertyId;
const PANORAMA = "panorama-landing";
const TRUST_SIGNALS = "trust-signals";
const ESSENTIALS = ["website.basic", "website.booking"];
const ELITE = [...ESSENTIALS, "website.unlimited_pages", "website.multi_property"];
const STORED_SITE_PROPERTIES = [
  { propertyId: PROPERTY_ID, slug: "villa-bisous" },
  { propertyId: "listing-garden", slug: "garden-house" },
];

const ESSENTIALS_READ = () => Promise.resolve(ESSENTIALS);
const FAILED_READ = () => Promise.reject(new Error("Website entitlements request failed (500)."));
const PENDING_READ = () => new Promise(() => {});
const PAGES_ONLY_READ = () => Promise.resolve([...ESSENTIALS, "website.unlimited_pages"]);
const ELITE_READ = () => Promise.resolve(ELITE);

const HOSTS_WITHOUT_THE_SECTION = [
  ["an Essentials plan", ESSENTIALS_READ, PANORAMA],
  ["a failed plan read", FAILED_READ, PANORAMA],
  ["a plan read that never answers", PENDING_READ, PANORAMA],
  ["Elite pages without multi-property", PAGES_ONLY_READ, PANORAMA],
  ["multi-property on a template without it", ELITE_READ, TRUST_SIGNALS],
];

const buildDraft = (templateKey) => ({
  id: "draft-1",
  propertyId: PROPERTY_ID,
  templateKey,
  status: "DRAFT",
  contentOverrides: { siteProperties: STORED_SITE_PROPERTIES, ...renderPayload.contentOverrides },
  themeOverrides: renderPayload.themeOverrides,
  publishedContentOverrides: { ...renderPayload.contentOverrides, siteProperties: STORED_SITE_PROPERTIES },
  publishedThemeOverrides: renderPayload.themeOverrides,
});

const renderEditor = async (readEntitlements, templateKey) => {
  fetchWebsiteDraftByPropertyId.mockResolvedValue(buildDraft(templateKey));
  getWebsiteEntitlements.mockImplementation(readEntitlements);
  const view = render(
    <MemoryRouter initialEntries={[`/editor/${PROPERTY_ID}`]}>
      <Routes>
        <Route path="/editor/:propertyId" element={<WebsiteEditorPage />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByTestId("editor-preview");
  await act(async () => {});
  return view;
};

const renderedEditorHtml = async (readEntitlements, templateKey) => {
  const view = await renderEditor(readEntitlements, templateKey);
  const html = view.container.innerHTML;
  view.unmount();
  return html;
};

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = jest.fn(() => Promise.reject(new Error("Unexpected request.")));
  fetchWebsitePropertyDetails.mockResolvedValue(renderPayload.propertySnapshot);
  fetchWebsiteSiteByPropertyId.mockResolvedValue(null);
  upsertWebsiteDraft.mockImplementation((payload) => Promise.resolve({ ...buildDraft(payload.templateKey), ...payload }));
});

afterEach(() => {
  delete globalThis.fetch;
});

describe("the website editor of a host without multi-property", () => {
  it("renders the same page as before, whatever the plan read answers", async () => {
    const pages = [];
    for (const read of [ESSENTIALS_READ, FAILED_READ, PENDING_READ]) {
      pages.push(await renderedEditorHtml(read, PANORAMA));
    }

    expect(new Set(pages).size).toBe(1);
    expect(pages[0]).toMatchSnapshot();
  });

  it("renders the Elite pages editor as before", async () => {
    expect(await renderedEditorHtml(PAGES_ONLY_READ, PANORAMA)).toMatchSnapshot();
  });

  it("renders a template without the section as it does for Essentials", async () => {
    const essentialsPage = await renderedEditorHtml(ESSENTIALS_READ, TRUST_SIGNALS);

    expect(await renderedEditorHtml(ELITE_READ, TRUST_SIGNALS)).toBe(essentialsPage);
  });

  it.each(HOSTS_WITHOUT_THE_SECTION)("makes no new request for %s", async (_name, readEntitlements, templateKey) => {
    await renderEditor(readEntitlements, templateKey);

    expect(screen.queryByRole("button", { name: /^Properties/ })).toBeNull();
    expect(getWebsiteEntitlements).toHaveBeenCalledTimes(1);
    expect(fetchHostPropertySelectOptions).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(HOSTS_WITHOUT_THE_SECTION)(
    "saves the stored list of properties as it is for %s",
    async (_name, readEntitlements, templateKey) => {
      await renderEditor(readEntitlements, templateKey);

      fireEvent.change(screen.getByLabelText("Hero title"), { target: { value: "A quiet villa" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(upsertWebsiteDraft).toHaveBeenCalledTimes(1));

      const payload = upsertWebsiteDraft.mock.calls[0][0];
      expect(JSON.stringify(payload.contentOverrides)).toBe(
        JSON.stringify({
          siteProperties: STORED_SITE_PROPERTIES,
          ...renderPayload.contentOverrides,
          heroTitle: "A quiet villa",
        })
      );
      expect(payload.publishedContentOverrides).toEqual(buildDraft(templateKey).publishedContentOverrides);
    }
  );
});
