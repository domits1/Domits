/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import HostIntegrations from "./HostIntegrations";
import { getIdToken } from "../../services/getAccessToken";

jest.mock("../../services/getAccessToken", () =>
  require("./testUtils/authorizedFetchMocks").createGetAccessTokenMock()
);

jest.mock("./hostmessages/context/AuthContext", () =>
  require("./testUtils/authorizedFetchMocks").createAuthContextMock()
);

jest.mock("./hostmessages/hooks/useAuth", () => require("./testUtils/authorizedFetchMocks").createUseAuthMock());

const { mockJsonResponse, expectAuthorizedCall } = require("./testUtils/authorizedFetchMocks");

describe("HostIntegrations Authorization header", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    getIdToken.mockReset().mockResolvedValue("id-token-1");
    globalThis.confirm = jest.fn(() => true);
  });

  test("GET /integrations on mount sends Authorization: Bearer <idToken>", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse([]));

    render(<HostIntegrations />);

    await expectAuthorizedCall("/integrations?userId=");
  });

  test("POST /integrations/whatsapp/connect/start sends Authorization: Bearer <idToken>", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse([]));
    render(<HostIntegrations />);
    await screen.findByText("Connect your WhatsApp Business");

    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse({ connectSessionId: "session-1" }));
    fireEvent.click(screen.getByText("Connect your WhatsApp Business"));

    await expectAuthorizedCall("/integrations/whatsapp/connect/start");
  });

  test("POST /integrations/whatsapp/disconnect sends Authorization: Bearer <idToken>", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse([{ id: "int-1", channel: "WHATSAPP", externalAccountId: "phone-1", status: "CONNECTED" }])
    );
    render(<HostIntegrations />);
    const disconnectButton = await screen.findByText("Disconnect WhatsApp");

    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse({}));
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse([]));
    fireEvent.click(disconnectButton);

    await expectAuthorizedCall("/integrations/whatsapp/disconnect");
  });
});
