/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WhatsAppConnectCallback from "./WhatsAppConnectCallback";
import { getIdToken } from "../../services/getAccessToken";

jest.mock("../../services/getAccessToken", () =>
  require("./testUtils/authorizedFetchMocks").createGetAccessTokenMock()
);

jest.mock("./hostmessages/context/AuthContext", () =>
  require("./testUtils/authorizedFetchMocks").createAuthContextMock()
);

jest.mock("./hostmessages/hooks/useAuth", () => require("./testUtils/authorizedFetchMocks").createUseAuthMock());

const { mockJsonResponse, expectAuthorizedCall } = require("./testUtils/authorizedFetchMocks");

const encodeState = (state) => btoa(JSON.stringify(state));

const renderAtCallbackUrl = (search) =>
  render(
    <MemoryRouter initialEntries={[`/hostdashboard/integrations-marketplace/whatsapp/callback${search}`]}>
      <WhatsAppConnectCallback />
    </MemoryRouter>
  );

describe("WhatsAppConnectCallback Authorization header", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    getIdToken.mockReset().mockResolvedValue("id-token-1");
    globalThis.sessionStorage.clear();
  });

  test("POST /integrations/whatsapp/connect/complete sends Authorization: Bearer <idToken>", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse({ selectableNumbers: [] }));

    const state = encodeState({ userId: "host-1", connectSessionId: "session-1" });
    renderAtCallbackUrl(`?code=auth-code-1&state=${state}`);

    await expectAuthorizedCall("/integrations/whatsapp/connect/complete");
  });

  test("POST /integrations/whatsapp/connect/select-number sends Authorization: Bearer <idToken>", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse({ selectableNumbers: [{ phoneNumberId: "phone-1", displayName: "My Number" }] })
    );

    const state = encodeState({ userId: "host-1", connectSessionId: "session-2" });
    renderAtCallbackUrl(`?code=auth-code-2&state=${state}`);

    const useButton = await screen.findByText("Use this number");

    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse({}));
    fireEvent.click(useButton);

    await expectAuthorizedCall("/integrations/whatsapp/connect/select-number");
  });
});
