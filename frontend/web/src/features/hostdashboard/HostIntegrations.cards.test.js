/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
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

const renderPage = (language = "en") =>
  render(
    <LanguageContext.Provider value={{ language }}>
      <HostIntegrations />
    </LanguageContext.Provider>
  );

const cardOf = (name) => screen.getByRole("heading", { name, level: 2 }).closest("article");

describe("HostIntegrations marketplace cards", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue(mockJsonResponse([]));
    getIdToken.mockReset().mockResolvedValue("id-token-1");
  });

  test("shows one card per integration with its category, status and description", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Integration marketplace", level: 1 })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Integrations" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);

    const pricelabs = within(cardOf("PriceLabs"));
    expect(pricelabs.getByText("Revenue management")).toBeInTheDocument();
    expect(pricelabs.getByText("Available")).toBeInTheDocument();
    expect(
      pricelabs.getByText(
        "Optimize your nightly rates with dynamic pricing based on market demand and property performance."
      )
    ).toBeInTheDocument();
    expect(within(cardOf("Truvi")).getByText("In development")).toBeInTheDocument();
    await screen.findByText("Connect your WhatsApp Business");
  });

  test("sends every integration except WhatsApp to the contact page", async () => {
    renderPage();

    ["PriceLabs", "Channex", "SiteMinder", "Truvi", "RemoteLock"].forEach((name) => {
      expect(within(cardOf(name)).getByRole("link", { name: "Talk to Sales" })).toHaveAttribute("href", "/contact");
    });
    await screen.findByText("Connect your WhatsApp Business");
  });

  test("lets the WhatsApp card open the existing WhatsApp connection on the same page", async () => {
    renderPage();

    const setUp = within(cardOf("WhatsApp")).getByRole("link", { name: "Set up WhatsApp" });
    expect(setUp).toHaveAttribute("href", "#whatsapp-connection");
    await screen.findByText("Connect your WhatsApp Business");
    expect(document.getElementById("whatsapp-connection")).toContainElement(
      screen.getByText("Connect your WhatsApp Business")
    );
  });

  test("shows the first letter of the name while there is no logo, hidden from screen readers", async () => {
    renderPage();

    const logo = within(cardOf("SiteMinder")).getByText("S");
    expect(logo).toHaveAttribute("aria-hidden", "true");
    await screen.findByText("Connect your WhatsApp Business");
  });

  test("uses the language of the host", async () => {
    renderPage("nl");

    expect(screen.getByRole("heading", { name: "Integratie-marketplace", level: 1 })).toBeInTheDocument();
    expect(within(cardOf("PriceLabs")).getByText("Beschikbaar")).toBeInTheDocument();
    expect(within(cardOf("Truvi")).getByRole("link", { name: "Neem contact op met Sales" })).toHaveAttribute(
      "href",
      "/contact"
    );
    await screen.findByText("Connect your WhatsApp Business");
  });
});
