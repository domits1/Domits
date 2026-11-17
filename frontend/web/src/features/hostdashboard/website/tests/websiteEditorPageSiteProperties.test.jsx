import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "react-toastify";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsiteEditorPage from "../WebsiteEditorPage";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "../services/websiteDraftService";
import { fetchWebsiteSiteByPropertyId, publishWebsiteSite } from "../services/websiteSiteService";
import { fetchWebsitePropertyDetails } from "../services/websitePropertyService";
import { getWebsiteEntitlements } from "../services/websitePlanService";
import { fetchHostPropertySelectOptions } from "../../services/hostTaskPropertyService";
import { SITE_PROPERTY_NOT_LISTED_MESSAGE } from "../editor/websiteEditorSiteProperties";

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
jest.mock("../services/websitePlanService", () => ({
  ...jest.requireActual("../services/websitePlanService"),
  getWebsiteEntitlements: jest.fn(),
}));
jest.mock("../../services/hostTaskPropertyService", () => ({ fetchHostPropertySelectOptions: jest.fn() }));
jest.mock("../rendering/WebsiteTemplatePreview", () => ({
  __esModule: true,
  default: () => <output data-testid="editor-preview" />,
}));

const PROPERTY_ID = renderPayload.site.propertyId;
const MAIN = { propertyId: PROPERTY_ID, slug: "wellness-villa-bisous" };
const GARDEN = { propertyId: "listing-garden", slug: "garden-house" };
const LIVE_SITE = { site: { id: "site-1", status: "PUBLISHED" }, domains: [] };
const LISTINGS = [
  { value: PROPERTY_ID, title: "Wellness Villa Bisous", status: "ACTIVE" },
  { value: GARDEN.propertyId, title: "Garden House", status: "ACTIVE" },
  { value: "listing-loft", title: "City Loft", status: "INACTIVE" },
];

const overridesWith = (siteProperties, otherOverrides) => ({
  ...otherOverrides,
  ...(siteProperties && { siteProperties }),
  ...renderPayload.contentOverrides,
});

const buildDraft = (siteProperties, publishedSiteProperties = siteProperties) => ({
  id: "draft-1",
  propertyId: PROPERTY_ID,
  templateKey: "panorama-landing",
  status: "DRAFT",
  contentOverrides: overridesWith(siteProperties, { sitePages: { gallery: { enabled: true, navLabel: "Photos" } } }),
  themeOverrides: renderPayload.themeOverrides,
  publishedContentOverrides: overridesWith(publishedSiteProperties, {}),
  publishedThemeOverrides: renderPayload.themeOverrides,
});

const renderEditor = async (draft = buildDraft()) => {
  fetchWebsiteDraftByPropertyId.mockResolvedValue(draft);
  render(
    <MemoryRouter initialEntries={[`/editor/${PROPERTY_ID}`]}>
      <Routes>
        <Route path="/editor/:propertyId" element={<WebsiteEditorPage />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByTestId("editor-preview");
  await act(async () => {});
  const sectionToggle = screen.queryByRole("button", { name: /^Properties/ });
  if (sectionToggle) {
    fireEvent.click(sectionToggle);
  }
};

const click = (name) => fireEvent.click(screen.getByRole("button", { name }));
const clickMenu = (name) => fireEvent.click(screen.getByRole("menuitem", { name, hidden: true }));
const slugField = (title) => screen.getByLabelText(`Address of ${title}`);
const saveButton = () => screen.getByRole("button", { name: "Save changes" });
const savedWith = async (count) => {
  await waitFor(() => expect(upsertWebsiteDraft).toHaveBeenCalledTimes(count));
  return upsertWebsiteDraft.mock.calls[count - 1][0];
};
const expectRefusal = async (message) => {
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
  expect(upsertWebsiteDraft).not.toHaveBeenCalled();
  expect(publishWebsiteSite).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
  getWebsiteEntitlements.mockResolvedValue(["website.basic", "website.unlimited_pages", "website.multi_property"]);
  fetchHostPropertySelectOptions.mockResolvedValue(LISTINGS);
  fetchWebsitePropertyDetails.mockResolvedValue(renderPayload.propertySnapshot);
  fetchWebsiteSiteByPropertyId.mockResolvedValue(null);
  publishWebsiteSite.mockResolvedValue(LIVE_SITE);
  upsertWebsiteDraft.mockImplementation((payload) => Promise.resolve({ ...buildDraft(), ...payload }));
});

describe("the Properties section of an Elite website", () => {
  it("adds a listing at a suggested address and saves it next to the other content", async () => {
    await renderEditor();

    click("Add Garden House");
    expect(slugField("Garden House")).toHaveValue("garden-house");
    expect(screen.getByText("/properties/wellness-villa-bisous")).toBeInTheDocument();
    fireEvent.click(saveButton());

    const payload = await savedWith(1);
    expect(payload.contentOverrides).toEqual(buildDraft([MAIN, GARDEN], null).contentOverrides);
    expect(payload.publishedContentOverrides).toEqual(buildDraft().publishedContentOverrides);
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(fetchHostPropertySelectOptions).toHaveBeenCalledTimes(1);
  });

  it("keeps every address lower case and unique, and saves the chosen order", async () => {
    await renderEditor(buildDraft([MAIN, GARDEN]));
    click("Move Garden House up");
    click("Move Garden House down");
    expect(saveButton()).toBeDisabled();

    fireEvent.change(slugField("Garden House"), { target: { value: "Wellness-Villa-Bisous" } });
    expect(slugField("Garden House")).toHaveValue("wellness-villa-bisous");
    expect(screen.getAllByText(/already has this address/)).toHaveLength(2);
    fireEvent.click(saveButton());
    await expectRefusal(
      "Fix the address of Wellness Villa Bisous: Another property on this website already has this address."
    );

    fireEvent.change(slugField("Garden House"), { target: { value: "the-garden" } });
    click("Move Garden House up");
    fireEvent.click(saveButton());

    expect((await savedWith(1)).contentOverrides.siteProperties).toEqual([{ ...GARDEN, slug: "the-garden" }, MAIN]);
  });

  it("goes back to the one-property draft and live site when the other properties are removed", async () => {
    fetchWebsiteSiteByPropertyId.mockResolvedValue(LIVE_SITE);
    await renderEditor(buildDraft([MAIN, GARDEN]));
    expect(screen.queryByRole("button", { name: "Remove Wellness Villa Bisous" })).toBeNull();

    click("Remove Garden House");
    clickMenu("Update live site");

    await waitFor(() => expect(publishWebsiteSite).toHaveBeenCalledWith(PROPERTY_ID));
    const payload = await savedWith(1);
    expect(payload.contentOverrides).toEqual(buildDraft().contentOverrides);
    expect(payload.publishedContentOverrides).not.toHaveProperty("siteProperties");
  });

  it("says which listing is not live and holds the live site update back", async () => {
    fetchWebsiteSiteByPropertyId.mockResolvedValue(LIVE_SITE);
    await renderEditor();

    expect(screen.getByText("Not live on Domits")).toBeInTheDocument();
    click("Add City Loft");
    expect(screen.getByText(/cannot be published while it is listed/)).toBeInTheDocument();
    clickMenu("Update live site");

    await expectRefusal(
      "City Loft is not live on Domits. Remove it from Properties or make it live before you publish."
    );
    fireEvent.click(saveButton());
    await savedWith(1);
  });

  it("asks to remove a listing that is gone, then to update the live site", async () => {
    fetchWebsiteSiteByPropertyId.mockResolvedValue(LIVE_SITE);
    await renderEditor(buildDraft([MAIN, { propertyId: "listing-gone", slug: "old-barn" }]));
    fireEvent.change(screen.getByLabelText("Hero title"), { target: { value: "A quiet villa" } });

    expect(screen.getByText(/This listing is no longer one of yours/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Address of A listing that is no longer yours")).toBeNull();
    fireEvent.click(saveButton());
    await expectRefusal(SITE_PROPERTY_NOT_LISTED_MESSAGE);
    click("Remove A listing that is no longer yours");
    upsertWebsiteDraft.mockRejectedValueOnce(new Error("siteProperties lists a property that does not exist."));
    fireEvent.click(saveButton());
    await savedWith(1);
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(toast.error).toHaveBeenLastCalledWith(SITE_PROPERTY_NOT_LISTED_MESSAGE);

    clickMenu("Update live site");
    await waitFor(() => expect(publishWebsiteSite).toHaveBeenCalledWith(PROPERTY_ID));
    expect((await savedWith(2)).publishedContentOverrides).not.toHaveProperty("siteProperties");
  });

  it.each([
    ["a failed read", () => Promise.reject(new Error("Failed to load your properties."))],
    ["an answer without the main property", () => Promise.resolve(LISTINGS.slice(1))],
  ])("keeps the stored list and the rest of the editor after %s", async (_name, readListings) => {
    fetchHostPropertySelectOptions.mockImplementationOnce(readListings);
    await renderEditor(buildDraft([MAIN, GARDEN]));

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your listings.");
    fireEvent.change(screen.getByLabelText("Hero title"), { target: { value: "A quiet villa" } });
    fireEvent.click(saveButton());
    expect((await savedWith(1)).contentOverrides.siteProperties).toEqual([MAIN, GARDEN]);

    click("Try again");
    expect(await screen.findByRole("button", { name: "Remove Garden House" })).toBeInTheDocument();
  });

  it.each([
    ["You must be the owner of the property to access it.", SITE_PROPERTY_NOT_LISTED_MESSAGE],
    [
      "siteProperties must not list a property or a slug twice.",
      "The properties of your website could not be saved. Check their addresses and save again.",
    ],
  ])("explains a refused save %j and keeps the list to save again", async (refusal, explanation) => {
    upsertWebsiteDraft.mockRejectedValueOnce(new Error(refusal));
    await renderEditor();

    click("Add Garden House");
    fireEvent.click(saveButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(explanation));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());
    expect(await savedWith(2)).toEqual(upsertWebsiteDraft.mock.calls[0][0]);
  });

  it("stops adding at 12 properties", async () => {
    const others = [...Array(12).keys()].map((n) => ({ value: `p-${n}`, title: `Home ${n}`, status: "ACTIVE" }));
    fetchHostPropertySelectOptions.mockResolvedValue([LISTINGS[0], ...others]);
    await renderEditor();

    others.slice(0, 11).forEach(({ title }) => click(`Add ${title}`));

    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Add Home 11" })).toBeDisabled();
    expect(screen.getByText("A website can show at most 12 properties.")).toBeInTheDocument();
  });

  it("returns the list to the published one on discard", async () => {
    jest.spyOn(globalThis, "confirm").mockReturnValue(true);
    await renderEditor(buildDraft([MAIN, GARDEN]));

    click("Move Garden House up");
    clickMenu("Discard all changes");

    await savedWith(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Move Wellness Villa Bisous up" })).toBeDisabled());
  });

  it("keeps the server's message for a host without the plan", async () => {
    const refusal = "siteProperties lists a property that does not exist.";
    getWebsiteEntitlements.mockResolvedValue(["website.basic"]);
    upsertWebsiteDraft.mockRejectedValueOnce(new Error(refusal));
    await renderEditor(buildDraft([MAIN, GARDEN]));

    fireEvent.change(screen.getByLabelText("Hero title"), { target: { value: "A quiet villa" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(refusal));
  });
});
