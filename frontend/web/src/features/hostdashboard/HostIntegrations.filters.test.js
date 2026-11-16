/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import HostIntegrations from "./HostIntegrations";
import { LanguageContext } from "../../context/LanguageContext";
import { getIdToken } from "../../services/getAccessToken";

jest.mock("../../services/getAccessToken", () =>
  require("./testUtils/authorizedFetchMocks").createGetAccessTokenMock()
);

jest.mock("./hostmessages/context/AuthContext", () =>
  require("./testUtils/authorizedFetchMocks").createAuthContextMock()
);

jest.mock("./hostmessages/hooks/useAuth", () => require("./testUtils/authorizedFetchMocks").createUseAuthMock());

const { mockJsonResponse } = require("./testUtils/authorizedFetchMocks");

const renderPage = async (language = "en") => {
  render(
    <LanguageContext.Provider value={{ language }}>
      <HostIntegrations />
    </LanguageContext.Provider>
  );
  await screen.findByText("Connect your WhatsApp Business");
};

const shownNames = () => {
  const list = screen.queryByRole("list", { name: /integrations|integraties/i });
  return list
    ? within(list)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
    : [];
};

const search = () => screen.getByRole("searchbox", { name: "Search integrations" });
const categoryFilter = () => screen.getByRole("combobox", { name: "Category" });
const statusFilter = () => screen.getByRole("combobox", { name: "Status" });

describe("HostIntegrations search and filters", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue(mockJsonResponse([]));
    getIdToken.mockReset().mockResolvedValue("id-token-1");
  });

  test("shows all six integrations and their count before anything is filtered", async () => {
    await renderPage();

    expect(shownNames()).toHaveLength(6);
    expect(screen.getByRole("status")).toHaveTextContent("6 integrations");
  });

  test("searches by name while the host types", async () => {
    await renderPage();

    fireEvent.change(search(), { target: { value: "site" } });

    expect(shownNames()).toEqual(["SiteMinder"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 integration");
  });

  test("filters by category", async () => {
    await renderPage();

    fireEvent.change(categoryFilter(), { target: { value: "channel_management" } });

    expect(shownNames()).toEqual(["Channex", "SiteMinder"]);
  });

  test("filters by status, offering only the statuses in use", async () => {
    await renderPage();

    const options = within(statusFilter())
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["All statuses", "Available", "In development"]);

    fireEvent.change(statusFilter(), { target: { value: "available" } });

    expect(shownNames()).toEqual(["PriceLabs", "Channex"]);
  });

  test("combines the search with both filters", async () => {
    await renderPage();

    fireEvent.change(categoryFilter(), { target: { value: "channel_management" } });
    fireEvent.change(statusFilter(), { target: { value: "in_development" } });
    expect(shownNames()).toEqual(["SiteMinder"]);

    fireEvent.change(search(), { target: { value: "chan" } });
    expect(shownNames()).toEqual([]);
  });

  test("shows an empty state that clears every filter and puts the focus back on the search", async () => {
    await renderPage();

    fireEvent.change(statusFilter(), { target: { value: "available" } });
    fireEvent.change(search(), { target: { value: "calry" } });

    expect(screen.getByText("No integrations found")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0 integrations");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(shownNames()).toHaveLength(6);
    expect(search()).toHaveValue("");
    expect(statusFilter()).toHaveValue("all");
    expect(search()).toHaveFocus();
    expect(screen.queryByText("No integrations found")).not.toBeInTheDocument();
  });

  test("keeps the WhatsApp connection on the page when the WhatsApp card is filtered out", async () => {
    await renderPage();

    fireEvent.change(search(), { target: { value: "truvi" } });

    expect(shownNames()).toEqual(["Truvi"]);
    expect(document.getElementById("whatsapp-connection")).toContainElement(
      screen.getByText("Connect your WhatsApp Business")
    );
  });

  test("uses the language of the host for the controls", async () => {
    await renderPage("nl");

    const searchbox = screen.getByRole("searchbox", { name: "Integraties zoeken" });
    fireEvent.change(searchbox, { target: { value: "xyz" } });

    expect(screen.getByText("Geen integraties gevonden")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters wissen" })).toBeInTheDocument();
  });
});
