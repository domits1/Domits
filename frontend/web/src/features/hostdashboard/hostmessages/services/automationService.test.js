/**
 * @jest-environment jsdom
 */

import { Auth } from "aws-amplify";
import {
  createAutomation,
  listAutomations,
  resolveAutomationApiBase,
} from "./automationService";

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

  test("uses the verified API for missing or known-wrong acceptance configuration", () => {
    const verifiedApi = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

    expect(resolveAutomationApiBase()).toBe(verifiedApi);
    expect(resolveAutomationApiBase("https://543s1lwby8.execute-api.eu-north-1.amazonaws.com/default")).toBe(verifiedApi);
  });

  test("preserves other configured API URLs and removes a trailing slash", () => {
    expect(resolveAutomationApiBase("https://example.execute-api.eu-north-1.amazonaws.com/default/")).toBe(
      "https://example.execute-api.eu-north-1.amazonaws.com/default"
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
