/**
 * @jest-environment jsdom
 */

import { Auth } from "aws-amplify";
import { createAutomation, listAutomations } from "./automationService";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentSession: jest.fn(),
  },
}));

describe("AutomatedMessaging API authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    Auth.currentSession.mockResolvedValue({
      getIdToken: () => ({ getJwtToken: () => "id-token-1" }),
    });
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  test("sends the Cognito ID token and JSON content type", async () => {
    await listAutomations();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/automations$/),
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer id-token-1",
        },
      })
    );
  });

  test("preserves JSON request bodies", async () => {
    await createAutomation({ name: "Welcome" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/automations$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Welcome" }),
      })
    );
  });

  test("does not send a request without an authenticated session", async () => {
    Auth.currentSession.mockRejectedValueOnce(new Error("No current user"));

    await expect(listAutomations()).rejects.toThrow("No current user");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
