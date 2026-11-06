/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Messages from "./Messages";
import { getIdToken } from "../../services/getAccessToken";
import { markThreadRead } from "../../features/hostdashboard/hostmessages/services/messagingService";
import { mockJsonResponse } from "../../features/hostdashboard/testUtils/authorizedFetchMocks";

let mockAuthState = { userId: "guest-1", accessToken: "access-token-1" };
let mockContacts = [];
let mockSetContacts = jest.fn();

jest.mock("../../services/getAccessToken", () => ({
  __esModule: true,
  getIdToken: jest.fn(),
}));

jest.mock("../../features/hostdashboard/hostmessages/services/messagingService", () => ({
  __esModule: true,
  markThreadRead: jest.fn(),
}));

jest.mock("../../features/hostdashboard/hostmessages/context/AuthContext", () => {
  const React = require("react");
  const PropTypes = require("prop-types");

  function MockUserProvider({ children }) {
    return React.createElement(React.Fragment, null, children);
  }

  MockUserProvider.propTypes = {
    children: PropTypes.node,
  };

  return {
    UserProvider: MockUserProvider,
    useUser: () => mockAuthState,
  };
});

jest.mock("../../features/hostdashboard/hostmessages/context/webSocketContext", () => {
  const React = require("react");
  const PropTypes = require("prop-types");

  function MockWebSocketProvider({ children }) {
    return React.createElement(React.Fragment, null, children);
  }

  MockWebSocketProvider.propTypes = {
    children: PropTypes.node,
  };

  return { WebSocketProvider: MockWebSocketProvider };
});

jest.mock("../../features/hostdashboard/hostmessages/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

jest.mock("../../features/hostdashboard/hostmessages/hooks/useFetchContacts", () => ({
  __esModule: true,
  default: () => ({
    contacts: mockContacts,
    pendingContacts: [],
    loading: false,
    setContacts: mockSetContacts,
  }),
}));

jest.mock("./ContactList", () => {
  const PropTypes = require("prop-types");

  function MockContactList({ contacts, onContactClick }) {
    return (
      <div data-testid="contact-list">
        {(contacts || []).map((contact) => (
          <button
            key={contact.threadId || contact.partnerId}
            type="button"
            onClick={() =>
              onContactClick(
                contact.partnerId,
                contact.givenName,
                contact.profileImage,
                contact.threadId,
                contact.propertyId,
                contact.bookingId,
                contact.propertyTitle,
                contact.accoImage,
                contact.platform || "DOMITS",
                contact.integrationAccountId || null,
                contact.externalThreadId || null
              )
            }
          >
            {contact.givenName}
          </button>
        ))}
      </div>
    );
  }

  MockContactList.propTypes = {
    contacts: PropTypes.arrayOf(PropTypes.object),
    onContactClick: PropTypes.func,
  };

  return MockContactList;
});

jest.mock("./ChatScreen", () => {
  const PropTypes = require("prop-types");

  function MockChatScreen({ contactId, threadId, bookingId, propertyId, bookingInDetailsPanel }) {
    return (
      <div
        data-testid="chat-screen"
        data-contact-id={contactId || ""}
        data-thread-id={threadId || ""}
        data-booking-id={bookingId || ""}
        data-property-id={propertyId || ""}
        data-booking-in-details-panel={String(Boolean(bookingInDetailsPanel))}
      />
    );
  }

  MockChatScreen.propTypes = {
    contactId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    threadId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bookingInDetailsPanel: PropTypes.bool,
  };

  return MockChatScreen;
});

jest.mock("./BookingTab", () => {
  const PropTypes = require("prop-types");

  function MockBookingTab({ bookingId, showAccommodation }) {
    return (
      <div
        data-testid="booking-tab"
        data-booking-id={bookingId || ""}
        data-show-accommodation={String(showAccommodation)}
      />
    );
  }

  MockBookingTab.propTypes = {
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    showAccommodation: PropTypes.bool,
  };

  return MockBookingTab;
});

jest.mock("./NewContactModal", () => () => null);
jest.mock("./ListingPanel", () => () => <div data-testid="listing-panel" />);

const renderMessages = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/guestdashboard/messages" element={<Messages dashboardType="guest" />} />
      </Routes>
    </MemoryRouter>
  );

describe("Messages booking URL context", () => {
  beforeEach(() => {
    mockAuthState = { userId: "guest-1", accessToken: "access-token-1" };
    mockSetContacts = jest.fn();
    getIdToken.mockReset();
    getIdToken.mockResolvedValue("id-token-1");
    markThreadRead.mockReset();
    markThreadRead.mockResolvedValue({ threadId: "thread-1", updated: 3 });
    mockContacts = [
      {
        partnerId: "host-1",
        givenName: "Reservation Host",
        threadId: "thread-1",
        propertyId: "property-1",
        bookingId: "booking-1",
        propertyTitle: "Exact stay",
        unreadCount: 3,
      },
    ];
  });

  test("selects the exact booking thread from a direct bookingId URL", async () => {
    renderMessages("/guestdashboard/messages?bookingId=booking-1");

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "host-1");
    });
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-thread-id", "thread-1");
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "booking-1");
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-property-id", "property-1");
  });

  test("loads guest messages without booking context when the URL has no bookingId", () => {
    renderMessages("/guestdashboard/messages");

    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "");
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "");
  });

  test("uses router state only as a fallback when bookingId is absent from the URL", async () => {
    renderMessages({
      pathname: "/guestdashboard/messages",
      state: {
        messageContext: {
          contactId: "host-2",
          contactName: "State Host",
          threadId: "thread-2",
          propertyId: "property-2",
          bookingId: "booking-2",
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "host-2");
    });
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "booking-2");
  });

  test("prefers the URL bookingId over stale router state", async () => {
    renderMessages({
      pathname: "/guestdashboard/messages",
      search: "?bookingId=booking-1",
      state: {
        messageContext: {
          contactId: "host-stale",
          contactName: "Stale Host",
          threadId: "thread-stale",
          propertyId: "property-stale",
          bookingId: "booking-stale",
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "booking-1");
    });
  });

  test("does not select a conversation for an unauthorized or missing bookingId", async () => {
    renderMessages("/guestdashboard/messages?bookingId=missing-booking");

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "missing-booking");
    });
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "");
  });

  test("opening a conversation marks it read using the shared ID token and clears the unread badge locally", async () => {
    renderMessages("/guestdashboard/messages?bookingId=booking-1");

    await waitFor(() => {
      expect(getIdToken).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(markThreadRead).toHaveBeenCalledWith("thread-1", "id-token-1");
    });

    await waitFor(() => {
      expect(mockSetContacts).toHaveBeenCalled();
    });

    const updaterFn = mockSetContacts.mock.calls.at(-1)[0];
    const updatedContacts = updaterFn(mockContacts);
    expect(updatedContacts.find((c) => c.threadId === "thread-1").unreadCount).toBe(0);
  });

  describe("on a desktop screen", () => {
    const originalInnerWidth = window.innerWidth;

    beforeEach(() => {
      window.innerWidth = 1440;
    });

    afterEach(() => {
      window.innerWidth = originalInnerWidth;
    });

    test("shows the reservation under the listing in the details panel instead of in the chat", async () => {
      renderMessages("/guestdashboard/messages?bookingId=booking-1");

      await waitFor(() => {
        expect(screen.getByTestId("booking-tab")).toHaveAttribute("data-booking-id", "booking-1");
      });
      expect(screen.getByTestId("booking-tab")).toHaveAttribute("data-show-accommodation", "false");
      expect(screen.getByTestId("listing-panel")).toBeInTheDocument();
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-in-details-panel", "true");
    });
  });

  test("leaves the reservation in the chat when the screen is too small for the details panel", () => {
    renderMessages("/guestdashboard/messages?bookingId=booking-1");

    expect(screen.queryByTestId("booking-tab")).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-in-details-panel", "false");
  });
});

const hostMessages = () => (
  <MemoryRouter initialEntries={["/hostdashboard/messages"]}>
    <Routes>
      <Route path="/hostdashboard/messages" element={<Messages dashboardType="host" />} />
    </Routes>
  </MemoryRouter>
);

const createDeferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const flushPromises = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const WHATSAPP_BANNER = "Connect your WhatsApp Business";
const CONNECTED_WHATSAPP = [{ channel: "WHATSAPP", externalAccountId: "phone-1" }];

describe("Messages integrations request", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockAuthState = { userId: "host-1", accessToken: null };
    mockContacts = [];
    mockSetContacts = jest.fn();
    getIdToken.mockReset();
    globalThis.fetch = jest.fn().mockResolvedValue(mockJsonResponse([]));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("waits for the ID token before the first request and sends it with the user's own id", async () => {
    const token = createDeferred();
    getIdToken.mockReturnValue(token.promise);

    render(hostMessages());

    expect(globalThis.fetch).not.toHaveBeenCalled();

    token.resolve("id-token-1");

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/integrations\?userId=host-1$/);
    expect(options.headers.Authorization).toBe("Bearer id-token-1");
  });

  test("hides the banner when the request reports a connected WhatsApp account", async () => {
    getIdToken.mockResolvedValue("id-token-1");
    globalThis.fetch.mockResolvedValue(mockJsonResponse(CONNECTED_WHATSAPP));

    render(hostMessages());
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await flushPromises();

    expect(screen.queryByText(WHATSAPP_BANNER)).not.toBeInTheDocument();
  });

  test.each([
    ["the session cannot be loaded", () => getIdToken.mockRejectedValue(new Error("No current user"))],
    ["the session has no ID token", () => getIdToken.mockResolvedValue("")],
  ])("sends no request and shows the failed load state when %s", async (_label, arrangeSession) => {
    arrangeSession();

    render(hostMessages());

    expect(await screen.findByText(WHATSAPP_BANNER)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("sends one request when the context token arrives after the user", async () => {
    getIdToken.mockResolvedValue("id-token-1");
    const { rerender } = render(hostMessages());
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    mockAuthState = { userId: "host-1", accessToken: "id-token-1" };
    rerender(hostMessages());
    await flushPromises();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("sends one request when the effect runs twice while the token is loading", async () => {
    const token = createDeferred();
    getIdToken.mockReturnValue(token.promise);

    render(<React.StrictMode>{hostMessages()}</React.StrictMode>);
    expect(getIdToken).toHaveBeenCalledTimes(2);

    token.resolve("id-token-1");
    await flushPromises();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("sends no request when the page unmounts while the token is loading", async () => {
    const token = createDeferred();
    getIdToken.mockReturnValue(token.promise);
    const { unmount } = render(hostMessages());

    unmount();
    token.resolve("id-token-1");
    await flushPromises();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("keeps the newer empty result when an older connected answer arrives later", async () => {
    const olderResponse = createDeferred();
    getIdToken.mockResolvedValue("id-token-1");
    globalThis.fetch.mockReturnValueOnce(olderResponse.promise);
    const { rerender } = render(hostMessages());
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    mockAuthState = { userId: "host-2", accessToken: null };
    rerender(hostMessages());
    expect(await screen.findByText(WHATSAPP_BANNER)).toBeInTheDocument();

    olderResponse.resolve(mockJsonResponse(CONNECTED_WHATSAPP));
    await flushPromises();

    expect(screen.getByText(WHATSAPP_BANNER)).toBeInTheDocument();
  });

  test("keeps the newer connected result when an older request fails later", async () => {
    const olderResponse = createDeferred();
    getIdToken.mockResolvedValue("id-token-1");
    globalThis.fetch.mockReturnValueOnce(olderResponse.promise);
    const { rerender } = render(hostMessages());
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    globalThis.fetch.mockResolvedValue(mockJsonResponse(CONNECTED_WHATSAPP));
    mockAuthState = { userId: "host-2", accessToken: null };
    rerender(hostMessages());
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    await flushPromises();

    olderResponse.resolve(mockJsonResponse([], false));
    await flushPromises();

    expect(screen.queryByText(WHATSAPP_BANNER)).not.toBeInTheDocument();
  });
});
