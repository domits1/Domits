/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import { Auth } from "aws-amplify";
import BookingContainer from "./bookingContainer";

jest.mock("aws-amplify", () => ({
  Auth: { currentSession: jest.fn() },
}));

jest.mock("./dateSelectionContainer", () => ({ __esModule: true, default: () => null }));
jest.mock("./guestSelectionContainer", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/pricing", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/SkeletonBlock", () => ({ __esModule: true, default: () => null }));
jest.mock("../hooks/handleReservePress", () => ({ __esModule: true, default: () => () => {} }));
jest.mock("../../../hostdashboard/hostmessages/context/webSocketContext", () => ({
  __esModule: true,
  WebSocketProvider: ({ children }) => <>{children}</>,
}));
jest.mock("../../../hostdashboard/hostmessages/context/AuthContext", () => ({
  __esModule: true,
  UserProvider: ({ children }) => <>{children}</>,
}));
jest.mock("../../../hostdashboard/hostmessages/hooks/useAuth", () => ({
  __esModule: true,
  useAuth: () => ({ userId: "guest-1" }),
}));
jest.mock("../../../../components/messages/ChatScreen", () => ({
  __esModule: true,
  default: () => <div>Chat</div>,
}));

describe("MessageHostModalInner existing-thread lookup auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentSession.mockResolvedValue({
      getIdToken: () => ({ getJwtToken: () => "id-token-1" }),
    });
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  test("sends the Cognito ID token as a Bearer header", async () => {
    render(
      <BookingContainer
        property={{ property: { hostId: "host-1" } }}
        propertyId="prop-1"
        showMessageHost
        setShowMessageHost={() => {}}
      />
    );

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/threads?userId=guest-1"),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer id-token-1" }),
        })
      );
    });
  });
});
