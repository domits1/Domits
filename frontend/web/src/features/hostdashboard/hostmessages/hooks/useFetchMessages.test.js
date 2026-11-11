/**
 * @jest-environment jsdom
 */

import React, { useEffect } from "react";
import PropTypes from "prop-types";
import "@testing-library/jest-dom";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { WebSocketContext } from "../context/webSocketContext";
import { Auth } from "aws-amplify";
import useFetchMessages from "./useFetchMessages";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentSession: jest.fn(),
  },
}));

const Harness = ({ accessToken = null }) => {
  const { fetchMessages, error } = useFetchMessages("guest-1");

  useEffect(() => {
    fetchMessages("host-1", null, { accessToken, bookingId: "booking-1" });
  }, [accessToken, fetchMessages]);

  return <div data-testid="state" data-error={error?.message || ""} />;
};

Harness.propTypes = {
  accessToken: PropTypes.string,
};

const renderHarness = (accessToken = null) =>
  render(
    <WebSocketContext.Provider value={{ messages: [] }}>
      <Harness accessToken={accessToken} />
    </WebSocketContext.Provider>
  );

describe("useFetchMessages protected REST calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("does not call protected endpoints when token retrieval fails", async () => {
    Auth.currentSession.mockResolvedValue({
      getIdToken: () => ({ getJwtToken: () => "" }),
    });

    renderHarness(null);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveAttribute("data-error", "Authentication token is required.");
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("does not fetch /messages when /threads rejects authorization", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    renderHarness("access-token-1");

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    expect(globalThis.fetch.mock.calls[0][0]).toContain("/threads");
    expect(globalThis.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer access-token-1");
  });

  test("falls back to the Cognito ID token for /threads when no accessToken option is passed", async () => {
    Auth.currentSession.mockResolvedValue({
      getIdToken: () => ({ getJwtToken: () => "id-token-1" }),
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    renderHarness(null);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    expect(globalThis.fetch.mock.calls[0][0]).toContain("/threads");
    expect(globalThis.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer id-token-1");
  });
});

const THREAD_ID = "thread-1";
const OPTIONS = { accessToken: "token-1" };

const historyRow = (id, content, createdAt) => ({
  id,
  threadId: THREAD_ID,
  senderId: "guest-1",
  recipientId: "host-1",
  content,
  createdAt,
});

const livePush = (id, text, createdAt, overrides = {}) => ({
  ...(id ? { id } : {}),
  type: "message",
  senderId: "guest-1",
  userId: "guest-1",
  recipientId: "host-1",
  threadId: THREAD_ID,
  text,
  createdAt,
  ...overrides,
});

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body });

const mockMessagesEndpoint = (history) => {
  globalThis.fetch = jest.fn(async () => jsonResponse(history));
};

const threadRow = (threadId, id, content, createdAt) => ({ ...historyRow(id, content, createdAt), threadId });

const mockThreadsAndHistory = (threads, historyByThread) => {
  globalThis.fetch = jest.fn(async (url) => {
    const requested = new URL(String(url));
    if (requested.pathname.endsWith("/threads")) return jsonResponse(threads);
    return jsonResponse(historyByThread[requested.searchParams.get("threadId")] || []);
  });
};

const messagesCallsFor = (threadId) =>
  globalThis.fetch.mock.calls.filter(([url]) => new URL(String(url)).searchParams.get("threadId") === threadId);

const setupHook = () => {
  let wsMessages = [];
  const wrapper = ({ children }) => (
    <WebSocketContext.Provider value={{ messages: wsMessages }}>{children}</WebSocketContext.Provider>
  );
  wrapper.propTypes = { children: PropTypes.node };
  const hook = renderHook(() => useFetchMessages("host-1"), { wrapper });
  const push = (message) => {
    wsMessages = [...wsMessages, message];
    hook.rerender();
  };
  const startOpen = (threadId = THREAD_ID, options = OPTIONS) =>
    hook.result.current.fetchMessages("guest-1", threadId, options);
  const open = (threadId, options) =>
    act(async () => {
      await startOpen(threadId, options);
    });
  const beginOpen = () => {
    let opening;
    act(() => {
      opening = startOpen();
    });
    return opening;
  };
  const texts = () => hook.result.current.messages.map((m) => m.text);
  return { hook, push, open, beginOpen, texts };
};

describe("useFetchMessages history on open", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("a live message that arrived before the chat opened does not stop the history from loading", async () => {
    mockMessagesEndpoint([
      historyRow("old-1", "Earlier question", "2026-06-01T09:00:00.000Z"),
      historyRow("stored-2", "Live one", "2026-06-01T10:00:00.000Z"),
    ]);
    const { push, open, texts } = setupHook();
    push(livePush("stored-2", "Live one", "2026-06-01T10:00:00.000Z"));

    await open();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(texts()).toEqual(["Earlier question", "Live one"]);
  });

  test("a live message without an id that is also in the history appears once", async () => {
    mockMessagesEndpoint([
      historyRow("old-1", "Earlier question", "2026-06-01T09:00:00.000Z"),
      historyRow("uuid-9", "Hi there", "2026-06-01T10:00:02.000Z"),
    ]);
    const { push, open, texts } = setupHook();
    push(livePush(null, "Hi there", "2026-06-01T10:00:00.000Z"));

    await open();

    expect(texts()).toEqual(["Earlier question", "Hi there"]);
  });

  test("opening the same thread twice fetches once, even when the thread has no messages", async () => {
    mockMessagesEndpoint([]);
    const { open } = setupHook();

    await open();
    await open();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("a failed fetch keeps the live messages, and the next open retries", async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { push, open, texts } = setupHook();
    push(livePush("stored-1", "Live one", "2026-06-01T10:00:00.000Z"));

    await open();

    expect(texts()).toEqual(["Live one"]);

    globalThis.fetch.mockResolvedValueOnce(
      jsonResponse([
        historyRow("old-1", "Earlier question", "2026-06-01T09:00:00.000Z"),
        historyRow("stored-1", "Live one", "2026-06-01T10:00:00.000Z"),
      ])
    );
    await open();

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(texts()).toEqual(["Earlier question", "Live one"]);
  });

  test("a live message arriving during the fetch is still there afterwards", async () => {
    let resolveFetch;
    globalThis.fetch = jest.fn(() => new Promise((resolve) => (resolveFetch = resolve)));
    const { push, beginOpen, texts } = setupHook();

    const opening = beginOpen();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    push(livePush("stored-3", "Arrived mid-fetch", "2026-06-01T10:05:00.000Z"));
    await act(async () => {
      resolveFetch(jsonResponse([historyRow("old-1", "Earlier question", "2026-06-01T09:00:00.000Z")]));
      await opening;
    });

    expect(texts()).toEqual(["Earlier question", "Arrived mid-fetch"]);
  });

  test("two identical messages arriving during the fetch both stay", async () => {
    let resolveFetch;
    globalThis.fetch = jest.fn(() => new Promise((resolve) => (resolveFetch = resolve)));
    const { push, beginOpen, texts } = setupHook();

    const opening = beginOpen();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    push(livePush("stored-4", "ok", "2026-06-01T10:06:00.000Z"));
    push(livePush("stored-5", "ok", "2026-06-01T10:06:00.000Z"));
    await act(async () => {
      resolveFetch(jsonResponse([historyRow("old-1", "Earlier question", "2026-06-01T09:00:00.000Z")]));
      await opening;
    });

    expect(texts()).toEqual(["Earlier question", "ok", "ok"]);
  });

  test("a push with a stored id arriving after the fetch appears once", async () => {
    mockMessagesEndpoint([historyRow("stored-6", "Already in history", "2026-06-01T10:07:00.000Z")]);
    const { push, open, texts } = setupHook();

    await open();
    push(livePush("stored-6", "Already in history", "2026-06-01T10:07:00.000Z"));

    expect(texts()).toEqual(["Already in history"]);
  });

  test("when no thread resolves the live messages stay, and a later open fetches", async () => {
    const threads = [];
    globalThis.fetch = jest.fn(async (url) => {
      if (String(url).includes("/threads")) return jsonResponse(threads);
      return jsonResponse([
        historyRow("old-1", "Earlier question", "2026-06-01T09:00:00.000Z"),
        historyRow("stored-7", "Live one", "2026-06-01T10:08:00.000Z"),
      ]);
    });
    const { push, open, texts } = setupHook();
    push(livePush("stored-7", "Live one", "2026-06-01T10:08:00.000Z", { threadId: null }));

    await open(null, { ...OPTIONS, bookingId: "booking-1" });

    expect(texts()).toEqual(["Live one"]);

    threads.push({ id: THREAD_ID, hostId: "host-1", guestId: "guest-1", bookingId: "booking-1" });
    await open(null, { ...OPTIONS, bookingId: "booking-1" });

    expect(texts()).toEqual(["Earlier question", "Live one"]);
  });

  test("opening a second thread of the same guest does not keep the first thread's history", async () => {
    mockThreadsAndHistory([], {
      "thread-a": [threadRow("thread-a", "a-1", "Booking A question", "2026-06-01T09:00:00.000Z")],
      "thread-b": [threadRow("thread-b", "b-1", "Booking B question", "2026-06-02T09:00:00.000Z")],
    });
    const { hook, open } = setupHook();

    await open("thread-a");
    await open("thread-b");

    expect(hook.result.current.messagesByRecipient["guest-1"].map((m) => m.text)).toEqual(["Booking B question"]);
  });

  test("reopening a booking without a thread id fetches again and shows only that booking's messages", async () => {
    mockThreadsAndHistory(
      [
        { id: "thread-a", hostId: "host-1", guestId: "guest-1", bookingId: "booking-a" },
        { id: "thread-b", hostId: "host-1", guestId: "guest-1", bookingId: "booking-b" },
      ],
      {
        "thread-a": [threadRow("thread-a", "a-1", "Booking A question", "2026-06-01T09:00:00.000Z")],
        "thread-b": [threadRow("thread-b", "b-1", "Booking B question", "2026-06-02T09:00:00.000Z")],
      }
    );
    const { open, texts } = setupHook();

    await open(null, { ...OPTIONS, bookingId: "booking-a" });
    await open(null, { ...OPTIONS, bookingId: "booking-b" });
    await open(null, { ...OPTIONS, bookingId: "booking-a" });

    expect(messagesCallsFor("thread-a")).toHaveLength(2);
    expect(texts()).toEqual(["Booking A question"]);
  });

  test("opening a booking that has no thread yet does not show another booking's messages", async () => {
    mockThreadsAndHistory([{ id: "thread-a", hostId: "host-1", guestId: "guest-1", bookingId: "booking-a" }], {
      "thread-a": [threadRow("thread-a", "a-1", "Booking A question", "2026-06-01T09:00:00.000Z")],
    });
    const { open, texts } = setupHook();

    await open(null, { ...OPTIONS, bookingId: "booking-a" });
    await open(null, { ...OPTIONS, bookingId: "booking-c" });

    expect(texts()).toEqual([]);
  });
});
