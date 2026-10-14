/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { Auth } from "aws-amplify";
import { UserProvider, useUser } from "./AuthContext";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
    currentSession: jest.fn(),
  },
}));

const Harness = () => {
  const { accessToken } = useUser();
  return <div data-testid="token">{String(accessToken)}</div>;
};

describe("AuthContext token source", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue({
      attributes: { sub: "guest-1" },
    });
    Auth.currentSession.mockResolvedValue({
      getIdToken: () => ({ getJwtToken: () => "id-token-1" }),
    });
  });

  test("exposes the Cognito ID token, not the access token", async () => {
    render(
      <UserProvider>
        <Harness />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("id-token-1");
    });

    expect(Auth.currentSession).toHaveBeenCalled();
  });
});
