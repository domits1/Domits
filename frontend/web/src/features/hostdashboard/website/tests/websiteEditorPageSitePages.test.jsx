import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsiteEditorPage from "../WebsiteEditorPage";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "../services/websiteDraftService";
import { fetchWebsiteSiteByPropertyId, publishWebsiteSite } from "../services/websiteSiteService";
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
jest.mock("../rendering/WebsiteTemplatePreview", () => ({
  __esModule: true,
  default: function WebsiteTemplatePreviewStub({ model, activePageKey }) {
    return (
      <output
        data-testid="editor-preview"
        data-page={activePageKey}
        data-site-pages={JSON.stringify(model.sitePages ?? null)}
      />
    );
  },
}));

const PROPERTY_ID = renderPayload.site.propertyId;
const ESSENTIALS = ["website.basic", "website.booking"];
const STORED_SITE_PAGES = {
  contact: { navLabel: "Contact us", enabled: false },
  gallery: { navLabel: "Photos", enabled: true },
};

const ELITE = () => Promise.resolve([...ESSENTIALS, WEBSITE_ENTITLEMENT_UNLIMITED_PAGES]);
const DEFAULT_SITE_PAGES = {
  gallery: { enabled: false, navLabel: "Gallery" },
  accommodation: { enabled: false, navLabel: "Accommodation" },
  contact: { enabled: false, navLabel: "Contact us" },
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

const previewSitePages = () => JSON.parse(screen.getByTestId("editor-preview").dataset.sitePages);
const previewPage = () => screen.getByTestId("editor-preview").dataset.page;
const pagePicker = () => screen.queryByRole("tablist", { name: "Preview page" });
const pickerTabs = () => screen.getAllByRole("tab", { name: /./ }).filter((tab) => pagePicker().contains(tab));

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
  await screen.findByTestId("editor-preview");
  await act(async () => {});
};

const saveAfterTitleEdit = async () => {
  fireEvent.change(screen.getByLabelText("Hero title"), { target: { value: "A quiet villa" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(upsertWebsiteDraft).toHaveBeenCalledTimes(1));
  return upsertWebsiteDraft.mock.calls[0][0];
};

const openPagesSection = () => {
  fireEvent.click(screen.getByRole("button", { name: /^Pages/ }));
};

const switchPage = (name) => {
  fireEvent.click(screen.getByRole("checkbox", { name: `${name} page` }));
};

const saveButton = () => screen.getByRole("button", { name: "Save changes" });

const saveChanges = async () => {
  fireEvent.click(saveButton());
  await waitFor(() => expect(upsertWebsiteDraft).toHaveBeenCalledTimes(1));
  return upsertWebsiteDraft.mock.calls[0][0];
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(globalThis, "confirm").mockReturnValue(true);
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

    expect(previewSitePages()).toBeNull();
    expect(previewPage()).toBe("main");
    expect(pagePicker()).toBeNull();
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

  it("shows no page controls and writes nothing while it loads", async () => {
    await renderEditor(buildDraft(renderPayload.contentOverrides), readEntitlements);

    expect(screen.queryByRole("heading", { name: "Pages", hidden: true })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Gallery page", hidden: true })).toBeNull();
    expect(getWebsiteEntitlements).toHaveBeenCalledTimes(1);
    expect(upsertWebsiteDraft).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});

describe("website editor for an Elite host", () => {
  it("shows the stored site pages in the preview", async () => {
    await renderEditor(buildDraft({ ...renderPayload.contentOverrides, sitePages: STORED_SITE_PAGES }), ELITE);

    expect(previewSitePages()).toEqual({ ...DEFAULT_SITE_PAGES, gallery: { enabled: true, navLabel: "Photos" } });
    expect(pickerTabs().map((tab) => tab.textContent)).toEqual(["Home", "Photos"]);
    expect(previewPage()).toBe("main");
  });

  it("previews each switched-on page and falls back to Home when a page goes off", async () => {
    await renderEditor(buildDraft(renderPayload.contentOverrides), ELITE);
    openPagesSection();
    expect(pagePicker()).toBeNull();

    switchPage("Gallery");
    expect(previewPage()).toBe("gallery");
    expect(screen.getByRole("tab", { name: "Gallery" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Home" }));
    expect(previewPage()).toBe("main");

    switchPage("Accommodation");
    expect(previewPage()).toBe("accommodation");
    switchPage("Accommodation");
    expect(previewPage()).toBe("main");
    expect(pickerTabs().map((tab) => tab.textContent)).toEqual(["Home", "Gallery"]);

    switchPage("Gallery");
    expect(pagePicker()).toBeNull();
  });

  it("saves switched-on pages and their menu labels", async () => {
    await renderEditor(buildDraft(renderPayload.contentOverrides), ELITE);
    openPagesSection();

    switchPage("Gallery");
    switchPage("Accommodation");
    fireEvent.change(screen.getByLabelText("Accommodation menu label"), { target: { value: "  The   villa " } });
    expect(previewSitePages().accommodation).toEqual({ enabled: true, navLabel: "The villa" });
    const payload = await saveChanges();

    expect(JSON.stringify(payload.contentOverrides)).toBe(
      JSON.stringify({
        sitePages: {
          ...DEFAULT_SITE_PAGES,
          gallery: { enabled: true, navLabel: "Gallery" },
          accommodation: { enabled: true, navLabel: "The villa" },
        },
        ...renderPayload.contentOverrides,
      })
    );
    expect(payload.publishedContentOverrides).toEqual(renderPayload.contentOverrides);
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it("saves the default label for a label that cannot be used", async () => {
    await renderEditor(buildDraft(renderPayload.contentOverrides), ELITE);
    openPagesSection();

    switchPage("Contact us");
    fireEvent.change(screen.getByLabelText("Contact us menu label"), { target: { value: "<b>Call</b>" } });

    expect(screen.getByText(/This label cannot be used/)).toHaveTextContent("Contact us");
    const payload = await saveChanges();
    expect(payload.contentOverrides.sitePages.contact).toEqual({ enabled: true, navLabel: "Contact us" });
  });

  it("caps a menu label at the length the site menu accepts", async () => {
    await renderEditor(buildDraft(renderPayload.contentOverrides), ELITE);
    openPagesSection();
    switchPage("Gallery");

    expect(screen.getByLabelText("Gallery menu label")).toHaveAttribute("maxLength", "40");
  });

  it("reports no unsaved change for stored pages in another field order", async () => {
    await renderEditor(
      buildDraft({ sitePages: STORED_SITE_PAGES, ...renderPayload.contentOverrides }, renderPayload.contentOverrides),
      ELITE
    );
    openPagesSection();

    expect(saveButton()).toBeDisabled();
    switchPage("Contact us");
    expect(saveButton()).toBeEnabled();
    switchPage("Contact us");
    expect(saveButton()).toBeDisabled();
  });

  it("keeps the page switches when the save fails", async () => {
    upsertWebsiteDraft.mockRejectedValue(new Error("We could not save your website changes."));
    await renderEditor(buildDraft(renderPayload.contentOverrides), ELITE);
    openPagesSection();

    switchPage("Gallery");
    await saveChanges();

    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(screen.getByRole("checkbox", { name: "Gallery page" })).toBeChecked();
  });

  it("publishes the page settings with the live site", async () => {
    publishWebsiteSite.mockResolvedValue({ site: { id: "site-1", status: "PUBLISHED" }, domains: [] });
    await renderEditor(buildDraft(renderPayload.contentOverrides), ELITE);
    openPagesSection();

    switchPage("Gallery");
    fireEvent.click(screen.getByRole("menuitem", { name: "Publish live site", hidden: true }));

    await waitFor(() => expect(publishWebsiteSite).toHaveBeenCalledWith(PROPERTY_ID));
    const payload = upsertWebsiteDraft.mock.calls[0][0];
    expect(payload.publishedContentOverrides).toEqual(payload.contentOverrides);
    expect(payload.contentOverrides.sitePages.gallery).toEqual({ enabled: true, navLabel: "Gallery" });
  });

  it("returns the page settings to the published version on discard", async () => {
    const published = { ...renderPayload.contentOverrides, sitePages: STORED_SITE_PAGES };
    const working = { ...renderPayload.contentOverrides, sitePages: { contact: { enabled: true } } };
    await renderEditor(buildDraft(working, published), ELITE);
    openPagesSection();
    switchPage("Accommodation");

    fireEvent.click(screen.getByRole("menuitem", { name: "Discard all changes", hidden: true }));

    await waitFor(() => expect(upsertWebsiteDraft).toHaveBeenCalledTimes(1));
    expect(upsertWebsiteDraft.mock.calls[0][0].contentOverrides).toBe(published);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Gallery page" })).toBeChecked());
    expect(screen.getByRole("checkbox", { name: "Contact us page" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Accommodation page" })).not.toBeChecked();
  });

  it("has nothing left to publish once the pages are back to the published ones", async () => {
    const published = { sitePages: STORED_SITE_PAGES, ...renderPayload.contentOverrides };
    const working = { ...published, sitePages: { ...STORED_SITE_PAGES, contact: { enabled: true } } };
    await renderEditor(buildDraft(working, published), ELITE);
    const discard = screen.getByRole("menuitem", { name: "Discard all changes", hidden: true });
    expect(discard).toBeEnabled();

    openPagesSection();
    switchPage("Contact us");

    expect(discard).toBeDisabled();
  });
});
