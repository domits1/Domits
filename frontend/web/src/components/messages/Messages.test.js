/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Messages from "./Messages";
import { getIdToken } from "../../services/getAccessToken";
import { markThreadRead } from "../../features/hostdashboard/hostmessages/services/messagingService";

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
    useUser: () => ({ userId: "guest-1", accessToken: "access-token-1" }),
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
  useAuth: () => ({ userId: "guest-1", accessToken: "access-token-1" }),
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

  function MockChatScreen({ contactId, threadId, bookingId, propertyId }) {
    return (
      <div
        data-testid="chat-screen"
        data-contact-id={contactId || ""}
        data-thread-id={threadId || ""}
        data-booking-id={bookingId || ""}
        data-property-id={propertyId || ""}
      />
    );
  }

  MockChatScreen.propTypes = {
    contactId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    threadId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  return MockChatScreen;
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
});
