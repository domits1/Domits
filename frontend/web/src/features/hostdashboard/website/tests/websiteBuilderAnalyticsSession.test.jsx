import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import { LanguageContext } from "../../../../context/LanguageContext";
import WebsiteBuilderPage from "../WebsiteBuilderPage";
import { getWebsiteTemplateCopy } from "../websiteTemplates";
import { WEBSITE_CONNECTION_FAILED_MESSAGE, WEBSITE_SESSION_EXPIRED_MESSAGE } from "../services/websiteSession";

jest.mock("aws-amplify", () => ({ Auth: { currentSession: jest.fn(), userPool: { getCurrentUser: jest.fn() } } }));
jest.mock("../../services/hostTaskPropertyService", () => ({
  fetchHostPropertySelectOptions: async () => [{ value: "test-property", title: "Test listing" }],
}));
jest.mock("../services/websiteDraftService", () => ({
  ...jest.requireActual("../services/websiteDraftService"),
  fetchWebsiteDrafts: async () => [],
}));

const sessionWith = (accessToken) => ({ getAccessToken: () => ({ getJwtToken: () => accessToken }) });
const analyticsCalls = () => global.fetch.mock.calls.filter(([url]) => String(url).endsWith("/website/event"));

const renderBuilder = () =>
  render(
    <LanguageContext.Provider value={{ language: "en" }}>
      <MemoryRouter initialEntries={["/?propertyId=test-property"]}>
        <WebsiteBuilderPage />
      </MemoryRouter>
    </LanguageContext.Provider>
  );

describe("the website editor when a background analytics event fails on the login", () => {
  beforeEach(() => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    Auth.currentSession.mockReset();
    Auth.userPool.getCurrentUser.mockReset();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("keeps the editor usable and quiet when the backend rejects the login and it cannot be refreshed", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("revoked-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(null);

    renderBuilder();

    expect(await screen.findByRole("heading", { name: getWebsiteTemplateCopy("en").title })).toBeInTheDocument();
    await waitFor(() => expect(analyticsCalls().length).toBeGreaterThan(0));
    expect(screen.queryByText(WEBSITE_SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the editor quiet when the login check cannot reach Cognito", async () => {
    Auth.currentSession.mockRejectedValue(Object.assign(new Error("Network error"), { code: "NetworkError" }));

    renderBuilder();

    expect(await screen.findByRole("heading", { name: getWebsiteTemplateCopy("en").title })).toBeInTheDocument();
    await waitFor(() => expect(Auth.currentSession).toHaveBeenCalled());
    expect(analyticsCalls()).toEqual([]);
    expect(screen.queryByText(WEBSITE_CONNECTION_FAILED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
