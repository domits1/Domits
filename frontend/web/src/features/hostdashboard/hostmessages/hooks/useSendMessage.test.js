/**
 * @jest-environment jsdom
 */

import { act, renderHook } from "@testing-library/react";
import { useSendMessage } from "./useSendMessage";
import { sendUnifiedMessage, retryUnifiedMessage } from "../services/messagingService";

jest.mock("../services/messagingService", () => ({
  sendUnifiedMessage: jest.fn(),
  retryUnifiedMessage: jest.fn(),
}));

jest.mock("../services/websocket", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

describe("useSendMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const send = async () => {
    const { result } = renderHook(() => useSendMessage("host-1", "access-token-1"));
    let response;
    await act(async () => {
      response = await result.current.sendMessage("CHANNEX_GUEST:booking-1", "Hello guest", [], {
        platform: "CHANNEX",
        threadId: "thread-1",
      });
    });
    return response;
  };

  test("returns the saved message when the server saved the send as failed", async () => {
    const savedMessage = { id: "message-1", threadId: "thread-1", deliveryStatus: "failed" };
    const error = new Error("UnifiedMessaging /send failed: 502");
    error.savedMessage = savedMessage;
    sendUnifiedMessage.mockRejectedValue(error);

    await expect(send()).resolves.toEqual({
      success: false,
      error: "UnifiedMessaging /send failed: 502",
      saved: savedMessage,
    });
  });

  test("returns no saved message when the send failed before anything was saved", async () => {
    sendUnifiedMessage.mockRejectedValue(new Error("network error"));

    await expect(send()).resolves.toEqual({
      success: false,
      error: "network error",
      saved: null,
    });
  });
  const retry = async () => {
    const { result } = renderHook(() => useSendMessage("host-1", "access-token-1"));
    let response;
    await act(async () => {
      response = await result.current.retryMessage("message-1");
    });
    return response;
  };

  test("retryMessage returns the updated message when the retry went through", async () => {
    retryUnifiedMessage.mockResolvedValue({ id: "message-1", deliveryStatus: "sent", platformMessageId: "p-1" });

    await expect(retry()).resolves.toEqual({
      success: true,
      saved: { id: "message-1", deliveryStatus: "sent", platformMessageId: "p-1" },
    });
    expect(retryUnifiedMessage).toHaveBeenCalledWith({ messageId: "message-1", token: "access-token-1" });
  });

  test("retryMessage returns the failed row when the provider still fails", async () => {
    const stillFailed = { id: "message-1", deliveryStatus: "failed", errorCode: "UNAUTHORIZED" };
    const error = new Error("UnifiedMessaging /send failed: 502");
    error.savedMessage = stillFailed;
    retryUnifiedMessage.mockRejectedValue(error);

    await expect(retry()).resolves.toEqual({
      success: false,
      error: "UnifiedMessaging /send failed: 502",
      saved: stillFailed,
    });
  });

  test("retryMessage returns no saved row when the request itself failed", async () => {
    retryUnifiedMessage.mockRejectedValue(new Error("network error"));

    await expect(retry()).resolves.toEqual({ success: false, error: "network error", saved: null });
  });
});
