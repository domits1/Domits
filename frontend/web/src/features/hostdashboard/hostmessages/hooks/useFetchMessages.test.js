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

describe("useFetchMessages refetch for live messages with attachments", () => {
  const RAW_URL = "https://general-messaging-production-attachments.s3.amazonaws.com/images/abc-123.png";
  const SIGNED_URL = `${RAW_URL}?X-Amz-Signature=abc`;

  const storedWithSignedUrl = (id, createdAt) => ({
    ...historyRow(id, "See photo", createdAt),
    attachments: JSON.stringify([{ url: SIGNED_URL, type: "image", name: null }]),
  });
  const liveWithRawUrl = (id, overrides = {}) =>
    livePush(id, "See photo", "2026-06-01T10:00:00.000Z", { fileUrls: [RAW_URL], ...overrides });
  const messageUrls = (hook, id, threadId = THREAD_ID) =>
    hook.result.current.messagesByThread[threadId]?.find((m) => m.id === id)?.fileUrls;
  const messagesCalls = () => globalThis.fetch.mock.calls.filter(([url]) => String(url).includes("/messages?"));

  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentSession.mockResolvedValue({ getIdToken: () => ({ getJwtToken: () => "id-token-1" }) });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("refetches the thread and shows the signed url when a live message with an attachment arrives", async () => {
    mockMessagesEndpoint([]);
    const { hook, push, open } = setupHook();
    await open();
    expect(messagesCalls()).toHaveLength(1);
    globalThis.fetch.mockImplementation(async () =>
      jsonResponse([storedWithSignedUrl("stored-1", "2026-06-01T10:00:00.000Z")])
    );

    await act(async () => push(liveWithRawUrl("stored-1")));

    await waitFor(() => expect(messageUrls(hook, "stored-1")).toEqual([SIGNED_URL]));
    expect(messagesCalls()).toHaveLength(2);
    expect(String(messagesCalls()[1][0])).toContain(`threadId=${THREAD_ID}`);
    expect(messagesCalls()[1][1].headers.Authorization).toBe("Bearer id-token-1");
  });

  test("shows the message once, with the signed url", async () => {
    mockMessagesEndpoint([]);
    const { hook, push, open } = setupHook();
    await open();
    globalThis.fetch.mockImplementation(async () =>
      jsonResponse([storedWithSignedUrl("stored-1", "2026-06-01T10:00:00.000Z")])
    );

    await act(async () => push(liveWithRawUrl("stored-1")));

    await waitFor(() => expect(messageUrls(hook, "stored-1")).toEqual([SIGNED_URL]));
    expect(hook.result.current.messagesByThread[THREAD_ID].filter((m) => m.id === "stored-1")).toHaveLength(1);
  });

  test("does not refetch for a live message without attachments", async () => {
    mockMessagesEndpoint([]);
    const { push, open } = setupHook();
    await open();

    await act(async () => push(livePush("stored-2", "Just text", "2026-06-01T10:00:00.000Z")));

    expect(messagesCalls()).toHaveLength(1);
  });

  test("refetches once for a live message, even when later messages arrive", async () => {
    mockMessagesEndpoint([]);
    const { push, open } = setupHook();
    await open();

    await act(async () => push(liveWithRawUrl("stored-1")));
    await waitFor(() => expect(messagesCalls()).toHaveLength(2));
    await act(async () => push(livePush("stored-2", "Just text", "2026-06-01T10:01:00.000Z")));

    expect(messagesCalls()).toHaveLength(2);
  });

  test("keeps the live message when the refetched history does not have it yet", async () => {
    mockMessagesEndpoint([]);
    const { hook, push, open } = setupHook();
    await open();

    await act(async () => push(liveWithRawUrl("stored-1")));

    await waitFor(() => expect(messagesCalls()).toHaveLength(2));
    expect(messageUrls(hook, "stored-1")).toEqual([RAW_URL]);
  });

  test("keeps the live message and raises no error when the refetch fails", async () => {
    mockMessagesEndpoint([]);
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { hook, push, open } = setupHook();
    await open();
    globalThis.fetch.mockImplementation(async () => ({ ok: false, status: 500, text: async () => "boom" }));

    await act(async () => push(liveWithRawUrl("stored-1")));

    await waitFor(() => expect(messagesCalls()).toHaveLength(2));
    expect(messageUrls(hook, "stored-1")).toEqual([RAW_URL]);
    expect(hook.result.current.error).toBeNull();
  });

  test("keeps the live message and raises no error when the refetch cannot reach the server", async () => {
    mockMessagesEndpoint([]);
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { hook, push, open } = setupHook();
    await open();
    globalThis.fetch.mockImplementation(async () => {
      throw new Error("network");
    });

    await act(async () => push(liveWithRawUrl("stored-1")));

    await waitFor(() => expect(messagesCalls()).toHaveLength(2));
    expect(messageUrls(hook, "stored-1")).toEqual([RAW_URL]);
    expect(hook.result.current.error).toBeNull();
  });

  test("refetches the thread of the message without changing the open conversation", async () => {
    mockMessagesEndpoint([historyRow("old-1", "Earlier question", "2026-06-01T09:00:00.000Z")]);
    const { hook, push, open, texts } = setupHook();
    await open();
    globalThis.fetch.mockImplementation(async (url) =>
      jsonResponse(
        new URL(String(url)).searchParams.get("threadId") === "thread-2"
          ? [{ ...storedWithSignedUrl("stored-9", "2026-06-01T10:00:00.000Z"), threadId: "thread-2" }]
          : []
      )
    );

    await act(async () => push(liveWithRawUrl("stored-9", { threadId: "thread-2" })));

    await waitFor(() => expect(messageUrls(hook, "stored-9", "thread-2")).toEqual([SIGNED_URL]));
    expect(messagesCalls().at(-1)[0]).toContain("threadId=thread-2");
    expect(texts()).toEqual(["Earlier question"]);
  });

  test("does not refetch for a live message that has no thread", async () => {
    mockMessagesEndpoint([]);
    const { push, open } = setupHook();
    await open();

    await act(async () => push(liveWithRawUrl("stored-1", { threadId: null })));

    expect(messagesCalls()).toHaveLength(1);
  });

  test("refetches once for several live messages of the same thread that arrive together", async () => {
    mockMessagesEndpoint([]);
    let wsMessages = [];
    const wrapper = ({ children }) => (
      <WebSocketContext.Provider value={{ messages: wsMessages }}>{children}</WebSocketContext.Provider>
    );
    wrapper.propTypes = { children: PropTypes.node };
    const hook = renderHook(() => useFetchMessages("host-1"), { wrapper });
    await act(async () => {
      await hook.result.current.fetchMessages("guest-1", THREAD_ID, OPTIONS);
    });
    expect(messagesCalls()).toHaveLength(1);

    wsMessages = [liveWithRawUrl("stored-1"), liveWithRawUrl("stored-2", { createdAt: "2026-06-01T10:01:00.000Z" })];
    await act(async () => hook.rerender());

    await waitFor(() => expect(messagesCalls()).toHaveLength(2));
    await act(async () => {});
    expect(messagesCalls()).toHaveLength(2);
  });
});

describe("useFetchMessages retry of the live-attachment refetch", () => {
  const RAW_URL = "https://general-messaging-production-attachments.s3.amazonaws.com/images/abc-123.png";
  const SIGNED_URL = `${RAW_URL}?X-Amz-Signature=abc`;
  const MESSAGE_ID = "stored-1";
  const RETRY_DELAYS = [1000, 3000, 6000];

  const stored = () => ({
    ...historyRow(MESSAGE_ID, "See photo", "2026-06-01T10:00:00.000Z"),
    attachments: JSON.stringify([{ url: SIGNED_URL, type: "image", name: null }]),
  });
  const live = () =>
    livePush(MESSAGE_ID, "See photo", "2026-06-01T10:00:00.000Z", { fileUrls: [RAW_URL] });
  const failure = () => ({ ok: false, status: 500, text: async () => "boom" });
  const signedUrls = (hook) =>
    hook.result.current.messagesByThread[THREAD_ID]?.find((m) => m.id === MESSAGE_ID)?.fileUrls;
  const messagesCalls = () => globalThis.fetch.mock.calls.filter(([url]) => String(url).includes("/messages?"));
  const advance = (ms) =>
    act(async () => {
      jest.advanceTimersByTime(ms);
      for (let tick = 0; tick < 20; tick += 1) await Promise.resolve();
    });
  const runAllRetries = async () => {
    for (const delay of RETRY_DELAYS) await advance(delay);
  };
  const answerWith = (...responses) => {
    const queue = [...responses];
    globalThis.fetch.mockImplementation(async () => {
      const next = queue.length > 1 ? queue.shift() : queue[0];
      return typeof next === "function" ? next() : next;
    });
  };
  const arrive = async () => {
    mockMessagesEndpoint([]);
    const harness = setupHook();
    await harness.open();
    return harness;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Auth.currentSession.mockResolvedValue({ getIdToken: () => ({ getJwtToken: () => "id-token-1" }) });
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("retries after a failed request and stores the signed url", async () => {
    const { hook, push } = await arrive();
    answerWith(failure(), jsonResponse([stored()]));

    await act(async () => push(live()));
    expect(messagesCalls()).toHaveLength(2);
    expect(signedUrls(hook)).toEqual([RAW_URL]);

    await advance(RETRY_DELAYS[0]);

    expect(messagesCalls()).toHaveLength(3);
    expect(signedUrls(hook)).toEqual([SIGNED_URL]);
  });

  test("retries when the rows do not contain the message yet", async () => {
    const { hook, push } = await arrive();
    answerWith(jsonResponse([]), jsonResponse([stored()]));

    await act(async () => push(live()));
    expect(signedUrls(hook)).toEqual([RAW_URL]);

    await advance(RETRY_DELAYS[0]);

    expect(messagesCalls()).toHaveLength(3);
    expect(signedUrls(hook)).toEqual([SIGNED_URL]);
  });

  test("waits 1s, 3s and 6s between the attempts", async () => {
    const { push } = await arrive();
    answerWith(failure());

    await act(async () => push(live()));
    expect(messagesCalls()).toHaveLength(2);

    await advance(RETRY_DELAYS[0] - 1);
    expect(messagesCalls()).toHaveLength(2);
    await advance(1);
    expect(messagesCalls()).toHaveLength(3);

    await advance(RETRY_DELAYS[1] - 1);
    expect(messagesCalls()).toHaveLength(3);
    await advance(1);
    expect(messagesCalls()).toHaveLength(4);

    await advance(RETRY_DELAYS[2] - 1);
    expect(messagesCalls()).toHaveLength(4);
    await advance(1);
    expect(messagesCalls()).toHaveLength(5);
  });

  test("stops after the first try and three retries", async () => {
    const { hook, push } = await arrive();
    answerWith(failure());

    await act(async () => push(live()));
    await runAllRetries();
    await advance(60000);

    expect(messagesCalls()).toHaveLength(5);
    expect(signedUrls(hook)).toEqual([RAW_URL]);
    expect(hook.result.current.error).toBeNull();
  });

  test("does not retry again once the message arrived", async () => {
    const { push } = await arrive();
    answerWith(jsonResponse([stored()]));

    await act(async () => push(live()));
    await advance(60000);

    expect(messagesCalls()).toHaveLength(2);
  });

  test("a later push does not start a second retry loop for the same message", async () => {
    const { push } = await arrive();
    answerWith(failure());

    await act(async () => push(live()));
    await act(async () => push(livePush("stored-2", "Just text", "2026-06-01T10:01:00.000Z")));
    await advance(RETRY_DELAYS[0]);

    expect(messagesCalls()).toHaveLength(3);
  });

  test("a message that arrives after the first loop ended gets no new loop", async () => {
    const { push } = await arrive();
    answerWith(failure());

    await act(async () => push(live()));
    await runAllRetries();
    await advance(60000);
    const callsAfterLimit = messagesCalls().length;
    await act(async () => push(livePush("stored-2", "Just text", "2026-06-01T10:01:00.000Z")));
    await advance(60000);

    expect(messagesCalls()).toHaveLength(callsAfterLimit);
  });

  test("stops fetching when the chat unmounts during the wait", async () => {
    const { hook, push } = await arrive();
    answerWith(failure());

    await act(async () => push(live()));
    expect(messagesCalls()).toHaveLength(2);
    hook.unmount();
    await advance(60000);

    expect(messagesCalls()).toHaveLength(2);
  });

  test("aborts a request that is still running when the chat unmounts", async () => {
    const { hook, push } = await arrive();
    let signal = null;
    globalThis.fetch.mockImplementation((_url, init) => {
      signal = init.signal;
      return new Promise(() => {});
    });

    await act(async () => push(live()));
    expect(signal.aborted).toBe(false);
    hook.unmount();

    expect(signal.aborted).toBe(true);
  });
});
