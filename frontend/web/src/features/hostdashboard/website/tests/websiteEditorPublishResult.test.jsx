import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "react-toastify";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsiteEditorPage from "../WebsiteEditorPage";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "../services/websiteDraftService";
import { fetchWithWebsiteSession } from "../services/websiteSession";
import { fetchWebsitePropertyDetails } from "../services/websitePropertyService";
import { getWebsiteEntitlements } from "../services/websitePlanService";

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/websiteSession", () => ({
  ...jest.requireActual("../services/websiteSession"),
  fetchWithWebsiteSession: jest.fn(),
}));
jest.mock("../services/websiteDraftService", () => ({
  ...jest.requireActual("../services/websiteDraftService"),
  fetchWebsiteDraftByPropertyId: jest.fn(),
  upsertWebsiteDraft: jest.fn(),
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
  default: function WebsiteTemplatePreviewStub() {
    return <output data-testid="editor-preview" />;
  },
}));

const PROPERTY_ID = renderPayload.site.propertyId;
const DRAFT_SAVED_AT = 1_800_000_000_000;
const EARLIER_PUBLISH_AT = DRAFT_SAVED_AT - 86_400_000;

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const siteSummary = (publishedAt) => ({
  site: { id: "site-1", propertyId: PROPERTY_ID, siteName: "cliff-house", status: "PUBLISHED", publishedAt },
  primaryDomain: { domain: "cliff-house.domits.com", status: "ACTIVE", isPrimary: true },
  domains: [{ domain: "cliff-house.domits.com", status: "ACTIVE", isPrimary: true }],
  isReachable: true,
});

const draft = {
  id: "draft-1",
  propertyId: PROPERTY_ID,
  templateKey: renderPayload.site.templateKey,
  status: "DRAFT",
  contentOverrides: renderPayload.contentOverrides,
  themeOverrides: renderPayload.themeOverrides,
  publishedContentOverrides: renderPayload.contentOverrides,
  publishedThemeOverrides: renderPayload.themeOverrides,
};

const network = { siteReads: [], publishAnswer: null };

const isPublishRequest = ([url]) => url.endsWith("/website/site/publish");
const isSiteRead = ([url]) => url.includes("/website/site?property=");
const publishRequests = () => fetchWithWebsiteSession.mock.calls.filter(isPublishRequest);
const siteReadCount = () => fetchWithWebsiteSession.mock.calls.filter(isSiteRead).length;

const answerSiteReads = (...answers) => {
  network.siteReads = answers;
};

const answerPublish = (answer) => {
  network.publishAnswer = answer;
};

const nextSiteRead = () => {
  const answer = network.siteReads.length > 1 ? network.siteReads.shift() : network.siteReads[0];
  return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
};

const renderEditor = async () => {
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

const menuItem = (name) => screen.getByRole("menuitem", { name, hidden: true });

const updateLiveSite = async () => {
  fireEvent.change(screen.getByLabelText("Hero title"), { target: { value: "A quiet villa" } });
  await waitFor(() => expect(menuItem("Update live site")).toBeEnabled());
  await act(async () => {
    fireEvent.click(menuItem("Update live site"));
  });
};

const publishLiveSite = async () => {
  await waitFor(() => expect(menuItem("Publish live site")).toBeEnabled());
  await act(async () => {
    fireEvent.click(menuItem("Publish live site"));
  });
};

const waitForResult = () =>
  waitFor(() => expect(toast.success.mock.calls.length + toast.error.mock.calls.length).toBeGreaterThan(0), {
    timeout: 3000,
  });

beforeEach(() => {
  jest.clearAllMocks();
  fetchWebsiteDraftByPropertyId.mockResolvedValue(draft);
  getWebsiteEntitlements.mockResolvedValue(["website.basic", "website.booking"]);
  fetchWebsitePropertyDetails.mockResolvedValue(renderPayload.propertySnapshot);
  upsertWebsiteDraft.mockImplementation((payload) =>
    Promise.resolve({ ...draft, ...payload, updatedAt: DRAFT_SAVED_AT })
  );
  answerSiteReads(jsonResponse(200, null));
  answerPublish(jsonResponse(200, siteSummary(DRAFT_SAVED_AT + 900)));
  fetchWithWebsiteSession.mockImplementation((...args) => {
    if (isPublishRequest(args)) {
      const answer = network.publishAnswer;
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    }
    if (isSiteRead(args)) {
      return nextSiteRead();
    }
    return Promise.reject(new Error(`Unexpected request ${args[0]}`));
  });
});

describe("website editor after a publish that works", () => {
  it("shows the live site as updated and sends the same requests as before", async () => {
    answerSiteReads(jsonResponse(200, siteSummary(EARLIER_PUBLISH_AT)));
    await renderEditor();

    await updateLiveSite();
    await waitForResult();

    expect(toast.success).toHaveBeenCalledWith("Live site updated.");
    expect(toast.error).not.toHaveBeenCalled();
    expect(publishRequests()).toHaveLength(1);
    expect(publishRequests()[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ propertyId: PROPERTY_ID }),
    });
    const savedDraft = upsertWebsiteDraft.mock.calls[0][0];
    expect(savedDraft.publishedContentOverrides).toEqual(savedDraft.contentOverrides);
    expect(screen.queryByText("We could not publish the direct booking website for this listing.")).toBeNull();
  });

  it("shows a new site as published with its live link", async () => {
    await renderEditor();

    await publishLiveSite();
    await waitForResult();

    expect(toast.success).toHaveBeenCalledWith("Live site published.");
    expect(toast.error).not.toHaveBeenCalled();
    expect(publishRequests()).toHaveLength(1);
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(menuItem("Open live site")).toBeInTheDocument();
  });
});
